import { Platform } from 'react-native';
import { callsApi } from './api';

// WebRTC globals - will be initialized based on platform
let RTCPeerConnection: any;
let RTCSessionDescription: any;
let RTCIceCandidate: any;
let mediaDevices: any;
let webrtcInitialized = false;

// Initialize WebRTC based on platform
function initializeWebRTC() {
  if (webrtcInitialized) return;
  
  if (Platform.OS === 'web') {
    // Web WebRTC - use browser native APIs
    RTCPeerConnection = (window as any).RTCPeerConnection || (window as any).webkitRTCPeerConnection;
    RTCSessionDescription = (window as any).RTCSessionDescription;
    RTCIceCandidate = (window as any).RTCIceCandidate;
    mediaDevices = navigator.mediaDevices;
  } else {
    // React Native WebRTC - dynamic require to avoid bundling on web
    try {
      const webrtc = require('react-native-webrtc');
      RTCPeerConnection = webrtc.RTCPeerConnection;
      RTCSessionDescription = webrtc.RTCSessionDescription;
      RTCIceCandidate = webrtc.RTCIceCandidate;
      mediaDevices = webrtc.mediaDevices;
    } catch (e) {
      console.error('Failed to load react-native-webrtc:', e);
    }
  }
  webrtcInitialized = true;
}

// Initialize on module load
initializeWebRTC();

// STUN/TURN servers for NAT traversal
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  // Free TURN server for testing
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export interface CallState {
  callId: string | null;
  status: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isFrontCamera: boolean;
  remoteStream: any | null;
  localStream: any | null;
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
  private peerConnection: any = null;
  private localStream: any = null;
  private remoteStream: any = null;
  private callId: string | null = null;
  private userId: string = '';
  private onStateChange: ((state: Partial<CallState>) => void) | null = null;
  private iceCandidatesQueue: any[] = [];
  private isFrontCamera: boolean = true;

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

  private createPeerConnection(): any {
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
    });

    pc.onicecandidate = async (event: any) => {
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

    pc.ontrack = (event: any) => {
      console.log('Remote track received:', event.track?.kind);
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.updateState({ remoteStream: this.remoteStream });
      }
    };

    pc.onaddstream = (event: any) => {
      // For React Native WebRTC compatibility
      console.log('Remote stream received');
      this.remoteStream = event.stream;
      this.updateState({ remoteStream: this.remoteStream });
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
      if (pc.iceConnectionState === 'connected') {
        this.updateState({ status: 'connected' });
      }
    };

    return pc;
  }

  async startCall(calleeId: string, callType: 'video' | 'audio' = 'video'): Promise<string | null> {
    try {
      console.log('Starting call to:', calleeId, 'type:', callType);
      
      // Get user media
      const constraints = {
        audio: true,
        video: callType === 'video' ? {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        } : false,
      };
      
      this.localStream = await mediaDevices.getUserMedia(constraints);
      console.log('Got local stream:', this.localStream.getTracks().length, 'tracks');

      this.updateState({
        localStream: this.localStream,
        isVideoEnabled: callType === 'video',
        isAudioEnabled: true,
        status: 'calling',
      });

      // Create peer connection
      this.peerConnection = this.createPeerConnection();

      // Add local tracks
      this.localStream.getTracks().forEach((track: any) => {
        if (this.peerConnection && this.localStream) {
          console.log('Adding track:', track.kind);
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Create offer
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video',
      });
      await this.peerConnection.setLocalDescription(offer);
      console.log('Created offer');

      // Send offer to server
      const response = await callsApi.initiateCall({
        caller_id: this.userId,
        callee_id: calleeId,
        offer: JSON.stringify(offer),
        call_type: callType,
      });

      this.callId = response.call_id;
      console.log('Call initiated:', this.callId);
      
      this.updateState({
        callId: this.callId,
        otherUser: response.callee_username || calleeId,
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
      console.log('Answering call:', callId);
      this.callId = callId;

      // Get user media
      this.localStream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      console.log('Got local stream for answer');

      this.updateState({
        localStream: this.localStream,
        isVideoEnabled: true,
        isAudioEnabled: true,
        callId: callId,
      });

      // Create peer connection
      this.peerConnection = this.createPeerConnection();

      // Add local tracks
      this.localStream.getTracks().forEach((track: any) => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Set remote description (the offer)
      const offerObj = JSON.parse(offer);
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerObj));
      console.log('Set remote description');

      // Process any queued ICE candidates
      for (const candidate of this.iceCandidatesQueue) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
      this.iceCandidatesQueue = [];

      // Create answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      console.log('Created answer');

      // Send answer to server
      await callsApi.answerCall({
        call_id: callId,
        callee_id: this.userId,
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

      console.log('Handling call answered');
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
      this.isFrontCamera = !this.isFrontCamera;
      
      // For React Native, use _switchCamera if available
      if (typeof videoTrack._switchCamera === 'function') {
        videoTrack._switchCamera();
        this.updateState({ isFrontCamera: this.isFrontCamera });
        return;
      }

      // Fallback: Get new stream with different camera
      const newStream = await mediaDevices.getUserMedia({
        video: { 
          facingMode: this.isFrontCamera ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      const newVideoTrack = newStream.getVideoTracks()[0];

      // Replace track in peer connection
      if (this.peerConnection) {
        const sender = this.peerConnection.getSenders().find((s: any) => s.track?.kind === 'video');
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
        isFrontCamera: this.isFrontCamera,
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
      this.isFrontCamera = !this.isFrontCamera; // Revert on error
    }
  }

  private cleanup(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track: any) => track.stop());
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
