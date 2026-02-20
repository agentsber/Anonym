import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../../src/stores/authStore';
import { groupsApi, contactsApi } from '../../../src/services/api';
import { Group, GroupMember, User } from '../../../src/types';

const COLORS = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#252525',
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  success: '#00D9A5',
  error: '#FF6B6B',
  warning: '#FDA7DF',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#333333',
};

export default function GroupManageScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [contacts, setContacts] = useState<User[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  const isAdmin = group?.members?.some(
    m => m.user_id === user?.id && m.role === 'admin'
  );
  const isCreator = group?.creator_id === user?.id;

  useEffect(() => {
    loadGroupData();
  }, [groupId]);

  const loadGroupData = async () => {
    if (!groupId) return;
    try {
      const groupInfo = await groupsApi.getGroupInfo(groupId);
      setGroup(groupInfo);
      setEditName(groupInfo.name);
    } catch (err) {
      console.error('Error loading group:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadContacts = async () => {
    if (!user) return;
    setIsLoadingContacts(true);
    try {
      const userContacts = await contactsApi.getAll(user.id);
      // Filter out users already in the group
      const memberIds = group?.members?.map(m => m.user_id) || [];
      const availableContacts = userContacts.filter(c => !memberIds.includes(c.id));
      setContacts(availableContacts);
    } catch (err) {
      console.error('Error loading contacts:', err);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleSaveName = async () => {
    if (!groupId || !user || !editName.trim()) return;
    setIsSaving(true);
    try {
      await groupsApi.updateGroup(groupId, { name: editName.trim() }, user.id);
      setGroup(prev => prev ? { ...prev, name: editName.trim() } : null);
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating group:', err);
      Alert.alert('Ошибка', 'Не удалось обновить название группы');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMember = async (contactId: string) => {
    if (!groupId || !user) return;
    try {
      await groupsApi.addMember(groupId, contactId, user.id);
      setShowAddMember(false);
      loadGroupData();
      Alert.alert('Успешно', 'Участник добавлен в группу');
    } catch (err: any) {
      Alert.alert('Ошибка', err.response?.data?.detail || 'Не удалось добавить участника');
    }
  };

  const handleRemoveMember = (memberId: string, username: string) => {
    Alert.alert(
      'Удалить участника',
      `Вы уверены, что хотите удалить ${username} из группы?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            if (!groupId || !user) return;
            try {
              await groupsApi.removeMember(groupId, memberId, user.id);
              loadGroupData();
            } catch (err: any) {
              Alert.alert('Ошибка', err.response?.data?.detail || 'Не удалось удалить участника');
            }
          },
        },
      ]
    );
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      'Покинуть группу',
      'Вы уверены, что хотите покинуть группу?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Покинуть',
          style: 'destructive',
          onPress: async () => {
            if (!groupId || !user) return;
            try {
              await groupsApi.removeMember(groupId, user.id, user.id);
              router.replace('/(tabs)');
            } catch (err: any) {
              Alert.alert('Ошибка', err.response?.data?.detail || 'Не удалось покинуть группу');
            }
          },
        },
      ]
    );
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      'Удалить группу',
      'Вы уверены? Все сообщения будут удалены навсегда.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            if (!groupId || !user) return;
            try {
              await groupsApi.deleteGroup(groupId, user.id);
              router.replace('/(tabs)');
            } catch (err: any) {
              Alert.alert('Ошибка', err.response?.data?.detail || 'Не удалось удалить группу');
            }
          },
        },
      ]
    );
  };

  const renderMember = ({ item }: { item: GroupMember }) => {
    const isCurrentUser = item.user_id === user?.id;
    const canRemove = isAdmin && !isCurrentUser && item.user_id !== group?.creator_id;
    
    return (
      <View style={styles.memberItem} data-testid={`member-${item.user_id}`}>
        <LinearGradient
          colors={item.role === 'admin' ? [COLORS.primary, COLORS.primaryLight] : [COLORS.surfaceLight, COLORS.surfaceLight]}
          style={styles.memberAvatar}
        >
          <Text style={styles.memberAvatarText}>
            {item.username?.charAt(0).toUpperCase()}
          </Text>
        </LinearGradient>
        
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>
            {item.username}
            {isCurrentUser && ' (Вы)'}
          </Text>
          <Text style={styles.memberRole}>
            {item.role === 'admin' ? 'Администратор' : 'Участник'}
          </Text>
        </View>
        
        {canRemove && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveMember(item.user_id, item.username)}
            data-testid={`remove-member-${item.user_id}`}
          >
            <Ionicons name="close-circle" size={24} color={COLORS.error} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderContactItem = ({ item }: { item: User }) => (
    <TouchableOpacity 
      style={styles.contactItem}
      onPress={() => handleAddMember(item.id)}
      data-testid={`add-contact-${item.id}`}
    >
      <LinearGradient
        colors={[COLORS.surfaceLight, COLORS.surfaceLight]}
        style={styles.memberAvatar}
      >
        <Text style={styles.memberAvatarText}>
          {item.username.charAt(0).toUpperCase()}
        </Text>
      </LinearGradient>
      <Text style={styles.contactName}>{item.username}</Text>
      <Ionicons name="add-circle" size={24} color={COLORS.success} />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerTitle: 'Управление группой',
        }}
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Group Header */}
        <View style={styles.groupHeader}>
          <LinearGradient
            colors={[group?.avatar_color || COLORS.primary, (group?.avatar_color || COLORS.primary) + '99']}
            style={styles.groupAvatar}
          >
            <Ionicons name="people" size={40} color="#FFF" />
          </LinearGradient>
          
          {isEditing ? (
            <View style={styles.editNameContainer}>
              <TextInput
                style={styles.editNameInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Название группы"
                placeholderTextColor={COLORS.textSecondary}
                autoFocus
                data-testid="edit-group-name-input"
              />
              <View style={styles.editButtons}>
                <TouchableOpacity
                  style={styles.editCancelButton}
                  onPress={() => {
                    setIsEditing(false);
                    setEditName(group?.name || '');
                  }}
                >
                  <Ionicons name="close" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editSaveButton, isSaving && { opacity: 0.5 }]}
                  onPress={handleSaveName}
                  disabled={isSaving}
                  data-testid="save-group-name-btn"
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Ionicons name="checkmark" size={20} color="#FFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.groupNameContainer}>
              <Text style={styles.groupName}>{group?.name}</Text>
              {isAdmin && (
                <TouchableOpacity
                  style={styles.editNameButton}
                  onPress={() => setIsEditing(true)}
                  data-testid="edit-group-name-btn"
                >
                  <Ionicons name="pencil" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            </View>
          )}
          
          <Text style={styles.groupMemberCount}>
            {group?.members?.length || 0} участников
          </Text>
        </View>

        {/* Members Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Участники</Text>
            {isAdmin && (
              <TouchableOpacity
                style={styles.addMemberButton}
                onPress={() => {
                  loadContacts();
                  setShowAddMember(true);
                }}
                data-testid="add-member-btn"
              >
                <Ionicons name="person-add" size={20} color={COLORS.primary} />
                <Text style={styles.addMemberText}>Добавить</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <FlatList
            data={group?.members || []}
            renderItem={renderMember}
            keyExtractor={(item) => item.user_id}
            scrollEnabled={false}
            contentContainerStyle={styles.membersList}
          />
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Действия</Text>
          
          {!isCreator && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleLeaveGroup}
              data-testid="leave-group-btn"
            >
              <Ionicons name="exit-outline" size={22} color={COLORS.warning} />
              <Text style={[styles.actionButtonText, { color: COLORS.warning }]}>
                Покинуть группу
              </Text>
            </TouchableOpacity>
          )}
          
          {isCreator && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDeleteGroup}
              data-testid="delete-group-btn"
            >
              <Ionicons name="trash-outline" size={22} color={COLORS.error} />
              <Text style={[styles.actionButtonText, { color: COLORS.error }]}>
                Удалить группу
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Add Member Modal */}
      <Modal
        visible={showAddMember}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddMember(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Добавить участника</Text>
              <TouchableOpacity
                onPress={() => setShowAddMember(false)}
                data-testid="close-add-member-modal"
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            {isLoadingContacts ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
            ) : contacts.length === 0 ? (
              <View style={styles.emptyContacts}>
                <Text style={styles.emptyContactsText}>
                  Нет доступных контактов для добавления
                </Text>
              </View>
            ) : (
              <FlatList
                data={contacts}
                renderItem={renderContactItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.contactsList}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  groupHeader: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  groupAvatar: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  groupNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  editNameButton: {
    padding: 8,
  },
  editNameContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  editNameInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  editCancelButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editSaveButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupMemberCount: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  addMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addMemberText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  membersList: {
    gap: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  memberRole: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  removeButton: {
    padding: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  contactsList: {
    padding: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  contactName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  emptyContacts: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContactsText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
