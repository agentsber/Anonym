import { GroupMessage } from '../../types';

export interface StickerPack {
  id: string;
  name: string;
  stickers: string[];
}

export interface ForwardTarget {
  type: 'user' | 'group';
  id: string;
  name: string;
  avatar_letter?: string;
  avatar_color?: string;
  member_count?: number;
}

export interface MessageItemProps {
  message: GroupMessage;
  currentUserId: string;
  messages: GroupMessage[];
  playingVoice: string | null;
  onLongPress: (message: GroupMessage) => void;
  onPlayVoice: (mediaUrl: string, messageId: string) => void;
}

export interface MessageMenuProps {
  visible: boolean;
  message: GroupMessage | null;
  currentUserId: string;
  isAdmin: boolean;
  onClose: () => void;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
  onForward: () => void;
}

export interface InputToolbarProps {
  inputText: string;
  isSending: boolean;
  showStickers: boolean;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onPickImage: () => void;
  onToggleStickers: () => void;
  onStartRecording: () => void;
}

export interface ReplyBarProps {
  replyTo: GroupMessage;
  onCancel: () => void;
}

export interface EditBarProps {
  editText: string;
  onChangeText: (text: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export interface RecordingBarProps {
  duration: number;
  onCancel: () => void;
  onStop: () => void;
}

export interface StickerPanelProps {
  stickerPacks: StickerPack[];
  activePackIndex: number;
  onSelectPack: (index: number) => void;
  onSelectSticker: (sticker: string) => void;
}

export interface PinnedMessagesModalProps {
  visible: boolean;
  messages: GroupMessage[];
  onClose: () => void;
}

export interface ForwardModalProps {
  visible: boolean;
  targets: { contacts: ForwardTarget[]; groups: ForwardTarget[] };
  isForwarding: boolean;
  onClose: () => void;
  onForward: (target: ForwardTarget) => void;
}

export interface SearchBarProps {
  query: string;
  results: GroupMessage[];
  onChangeQuery: (text: string) => void;
  onSearch: () => void;
  onSelectResult: (message: GroupMessage) => void;
}
