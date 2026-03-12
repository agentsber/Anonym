import { callsApi } from './api';

// STUN/TURN servers for NAT traversal
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

export interface CallState {
  callId: string | null;
  status: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isFrontCamera: boolean;
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  duration: number;
  otherUser: string;
}

export type CallEventType = 
  | 'incoming_call'
  | 'call_answered'
  | 'call_rejected'
  | 'call_ended'
  | 'ice_candidate'
  | 'call_media_update';

export interface CallEvent {
  type: CallEventType;
  data: any;
}

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private callId: string | null = null;
  private userId: string = '';
  private onStateChange: ((state: Partial<CallState>) => void) | null = null;
  private iceCandidatesQueue: RTCIceCandidateInit[] = [];

  setUserId(userId: string) {
    this.userId = userId;
  }

  setOnStateChange(callback: (state: Partial<CallState>) => void) {
    this.onStateChange = callback;
  }

  private updateState(state: Partial<CallState>) {
    if (this.onStateChange) {
      this.onStateChange(state);
    }
  }

  private createPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
    });

    pc.onicecandidate = async (event) => {
      if (event.candidate && this.callId) {
        try {
          await callsApi.sendIceCandidate({
            call_id: this.callId,
            user_id: this.userId,
            candidate: JSON.stringify(event.candidate),
          });
        } catch (error) {
          console.error('Error sending ICE candidate:', error);
        }
      }
    };

    pc.ontrack = (event) => {
      console.log('Remote track received:', event.track.kind);
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.updateState({ remoteStream: this.remoteStream });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        this.updateState({ status: 'connected' });
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.endCall();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
    };

    return pc;
  }

  async startCall(calleeId: string, callType: 'video' | 'audio' = 'video'): Promise<string | null> {
    try {
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true,
      });

      this.updateState({
        localStream: this.localStream,
        isVideoEnabled: callType === 'video',
        isAudioEnabled: true,
        status: 'calling',
      });

      // Create peer connection
      this.peerConnection = this.createPeerConnection();

      // Add local tracks
      this.localStream.getTracks().forEach((track) => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Create offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Send offer to server
      const response = await callsApi.initiateCall({
        caller_id: this.userId,
        callee_id: calleeId,
        offer: JSON.stringify(offer),
        call_type: callType,
      });

      this.callId = response.call_id;
      this.updateState({
        callId: this.callId,
        otherUser: response.callee_username,
      });

      return this.callId;
    } catch (error) {
      console.error('Error starting call:', error);
      this.cleanup();
      throw error;
    }
  }

  async answerCall(callId: string, offer: string): Promise<void> {
    try {
      this.callId = callId;

      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      this.updateState({
        localStream: this.localStream,
        isVideoEnabled: true,
        isAudioEnabled: true,
        callId: callId,
      });

      // Create peer connection
      this.peerConnection = this.createPeerConnection();

      // Add local tracks
      this.localStream.getTracks().forEach((track) => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Set remote description (the offer)
      const offerObj = JSON.parse(offer);
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerObj));

      // Process any queued ICE candidates
      for (const candidate of this.iceCandidatesQueue) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
      this.iceCandidatesQueue = [];

      // Create answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Send answer to server
      await callsApi.answerCall({
        call_id: callId,
        answer: JSON.stringify(answer),
      });

      this.updateState({ status: 'connected' });
    } catch (error) {
      console.error('Error answering call:', error);
      this.cleanup();
      throw error;
    }
  }

  async handleCallAnswered(answer: string): Promise<void> {
    try {
      if (!this.peerConnection) {
        console.error('No peer connection');
        return;
      }

      const answerObj = JSON.parse(answer);
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerObj));

      // Process any queued ICE candidates
      for (const candidate of this.iceCandidatesQueue) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
      this.iceCandidatesQueue = [];

      this.updateState({ status: 'connected' });
    } catch (error) {
      console.error('Error handling call answered:', error);
    }
  }

  async handleIceCandidate(candidateStr: string): Promise<void> {
    try {
      const candidate = JSON.parse(candidateStr);

      if (this.peerConnection && this.peerConnection.remoteDescription) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        // Queue the candidate for later
        this.iceCandidatesQueue.push(candidate);
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  async rejectCall(callId: string): Promise<void> {
    try {
      await callsApi.callAction({
        call_id: callId,
        user_id: this.userId,
        action: 'reject',
      });
      this.cleanup();
    } catch (error) {
      console.error('Error rejecting call:', error);
    }
  }

  async endCall(): Promise<void> {
    try {
      if (this.callId) {
        await callsApi.callAction({
          call_id: this.callId,
          user_id: this.userId,
          action: 'end',
        });
      }
    } catch (error) {
      console.error('Error ending call:', error);
    } finally {
      this.cleanup();
    }
  }

  toggleVideo(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this.updateState({ isVideoEnabled: videoTrack.enabled });

        // Notify other party
        if (this.callId) {
          callsApi.callAction({
            call_id: this.callId,
            user_id: this.userId,
            action: 'toggle_video',
          });
        }

        return videoTrack.enabled;
      }
    }
    return false;
  }

  toggleAudio(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.updateState({ isAudioEnabled: audioTrack.enabled });

        // Notify other party
        if (this.callId) {
          callsApi.callAction({
            call_id: this.callId,
            user_id: this.userId,
            action: 'toggle_audio',
          });
        }

        return audioTrack.enabled;
      }
    }
    return false;
  }

  async switchCamera(): Promise<void> {
    if (!this.localStream) return;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      // Get current facing mode
      const settings = videoTrack.getSettings();
      const currentFacingMode = settings.facingMode || 'user';
      const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

      // Get new stream with different camera
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: false,
      });

      const newVideoTrack = newStream.getVideoTracks()[0];

      // Replace track in peer connection
      if (this.peerConnection) {
        const sender = this.peerConnection.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }

      // Stop old track and replace in local stream
      videoTrack.stop();
      this.localStream.removeTrack(videoTrack);
      this.localStream.addTrack(newVideoTrack);

      this.updateState({
        localStream: this.localStream,
        isFrontCamera: newFacingMode === 'user',
      });

      // Notify other party
      if (this.callId) {
        callsApi.callAction({
          call_id: this.callId,
          user_id: this.userId,
          action: 'switch_camera',
        });
      }
    } catch (error) {
      console.error('Error switching camera:', error);
    }
  }

  private cleanup(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.callId = null;
    this.iceCandidatesQueue = [];

    this.updateState({
      callId: null,
      status: 'ended',
      localStream: null,
      remoteStream: null,
      isVideoEnabled: false,
      isAudioEnabled: false,
    });
  }

  getCallId(): string | null {
    return this.callId;
  }

  isInCall(): boolean {
    return this.callId !== null;
  }
}

export const webRTCService = new WebRTCService();
