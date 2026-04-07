// Mock for react-native-webrtc on web platform
// This file will be used when running on web to avoid bundling the native module

export const RTCPeerConnection = (window as any).RTCPeerConnection || (window as any).webkitRTCPeerConnection;
export const RTCSessionDescription = (window as any).RTCSessionDescription;
export const RTCIceCandidate = (window as any).RTCIceCandidate;
export const mediaDevices = navigator.mediaDevices;

// RTCView is not available on web - return null
export const RTCView = null;

export default {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  RTCView,
};
