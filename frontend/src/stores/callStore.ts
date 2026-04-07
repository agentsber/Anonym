import { create } from 'zustand';
import { Platform } from 'react-native';
import { callsApi } from '../services/api';

// Dynamic import based on platform to avoid bundling react-native-webrtc on web
const getWebRTCService = () => {
  if (Platform.OS === 'web') {
    return require('../services/webrtc.web').webRTCService;
  }
  return require('../services/webrtc').webRTCService;
};

const webRTCService = getWebRTCService();

// Import CallState type
interface CallState {
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

interface IncomingCall {
  callId: string;
  callerId: string;
  callerUsername: string;
  callType: 'video' | 'audio';
  offer: string;
}

interface CallStore extends CallState {
  incomingCall: IncomingCall | null;
  callHistory: any[];
  
  // Actions
  setUserId: (userId: string) => void;
  startCall: (calleeId: string, callType?: 'video' | 'audio') => Promise<void>;
  answerCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleVideo: () => void;
  toggleAudio: () => void;
  switchCamera: () => void;
  
  // Event handlers
  handleIncomingCall: (data: any) => void;
  handleCallAnswered: (data: any) => void;
  handleCallRejected: () => void;
  handleCallEnded: (data: any) => void;
  handleIceCandidate: (data: any) => void;
  handleMediaUpdate: (data: any) => void;
  
  // History
  fetchCallHistory: (userId: string) => Promise<void>;
  
  // Reset
  resetCallState: () => void;
}

const initialState: Omit<CallState, 'otherUser'> & { otherUser: string } = {
  callId: null,
  status: 'idle',
  isVideoEnabled: false,
  isAudioEnabled: false,
  isFrontCamera: true,
  remoteStream: null,
  localStream: null,
  duration: 0,
  otherUser: '',
};

export const useCallStore = create<CallStore>((set, get) => {
  // Set up WebRTC service state change callback
  webRTCService.setOnStateChange((state) => {
    set(state as Partial<CallStore>);
  });

  return {
    ...initialState,
    incomingCall: null,
    callHistory: [],

    setUserId: (userId: string) => {
      webRTCService.setUserId(userId);
    },

    startCall: async (calleeId: string, callType: 'video' | 'audio' = 'video') => {
      try {
        set({ status: 'calling' });
        await webRTCService.startCall(calleeId, callType);
      } catch (error: any) {
        console.error('Failed to start call:', error);
        set({ status: 'idle' });
        throw new Error(error.response?.data?.detail || 'Failed to start call');
      }
    },

    answerCall: async () => {
      const { incomingCall } = get();
      if (!incomingCall) return;

      try {
        set({ status: 'connected', otherUser: incomingCall.callerUsername });
        await webRTCService.answerCall(incomingCall.callId, incomingCall.offer);
        set({ incomingCall: null });
      } catch (error) {
        console.error('Failed to answer call:', error);
        set({ status: 'idle', incomingCall: null });
      }
    },

    rejectCall: async () => {
      const { incomingCall } = get();
      if (!incomingCall) return;

      try {
        await webRTCService.rejectCall(incomingCall.callId);
        set({ incomingCall: null, status: 'idle' });
      } catch (error) {
        console.error('Failed to reject call:', error);
        set({ incomingCall: null, status: 'idle' });
      }
    },

    endCall: async () => {
      try {
        await webRTCService.endCall();
        set({ ...initialState, incomingCall: null });
      } catch (error) {
        console.error('Failed to end call:', error);
        set({ ...initialState, incomingCall: null });
      }
    },

    toggleVideo: () => {
      webRTCService.toggleVideo();
    },

    toggleAudio: () => {
      webRTCService.toggleAudio();
    },

    switchCamera: () => {
      webRTCService.switchCamera();
    },

    handleIncomingCall: (data: any) => {
      console.log('Incoming call:', data);
      set({
        incomingCall: {
          callId: data.call_id,
          callerId: data.caller_id,
          callerUsername: data.caller_username,
          callType: data.call_type || 'video',
          offer: data.offer,
        },
        status: 'ringing',
      });
    },

    handleCallAnswered: async (data: any) => {
      console.log('Call answered:', data);
      await webRTCService.handleCallAnswered(data.answer);
    },

    handleCallRejected: () => {
      console.log('Call rejected');
      set({ ...initialState, status: 'ended' });
      webRTCService.endCall();
    },

    handleCallEnded: (data: any) => {
      console.log('Call ended:', data);
      set({ ...initialState, status: 'ended', duration: data.duration || 0 });
      webRTCService.endCall();
    },

    handleIceCandidate: async (data: any) => {
      await webRTCService.handleIceCandidate(data.candidate);
    },

    handleMediaUpdate: (data: any) => {
      console.log('Media update:', data);
      // Handle remote user's media state changes
      // This could update UI to show muted icons, etc.
    },

    fetchCallHistory: async (userId: string) => {
      try {
        const history = await callsApi.getCallHistory(userId);
        set({ callHistory: history });
      } catch (error) {
        console.error('Failed to fetch call history:', error);
      }
    },

    resetCallState: () => {
      set({ ...initialState, incomingCall: null });
    },
  };
});
