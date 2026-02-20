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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../src/stores/authStore';
import { contactsApi, groupsApi } from '../src/services/api';
import { User } from '../src/types';

const COLORS = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#252525',
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  success: '#00D9A5',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#333333',
};

export default function CreateGroupScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [groupName, setGroupName] = useState('');
  const [contacts, setContacts] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await contactsApi.getAll(user.id);
      setContacts(data);
    } catch (err) {
      console.error('Error loading contacts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!user || !groupName.trim()) {
      Alert.alert('Ошибка', 'Введите название группы');
      return;
    }
    
    if (selectedMembers.length === 0) {
      Alert.alert('Ошибка', 'Добавьте хотя бы одного участника в группу');
      return;
    }
    
    setIsCreating(true);
    try {
      const group = await groupsApi.create({
        name: groupName.trim(),
        creator_id: user.id,
        member_ids: selectedMembers,
      });
      
      router.replace(`/group/${group.id}`);
    } catch (err: any) {
      console.error('Error creating group:', err);
      Alert.alert('Ошибка', err.response?.data?.detail || 'Не удалось создать группу');
    } finally {
      setIsCreating(false);
    }
  };

  const canCreate = groupName.trim().length > 0 && selectedMembers.length > 0;

  const renderContact = ({ item }: { item: User }) => {
    const isSelected = selectedMembers.includes(item.id);
    
    return (
      <TouchableOpacity 
        style={[styles.contactItem, isSelected && styles.contactItemSelected]}
        onPress={() => toggleMember(item.id)}
      >
        <LinearGradient
          colors={isSelected ? [COLORS.primary, COLORS.primaryLight] : [COLORS.surfaceLight, COLORS.surfaceLight]}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>
            {item.username.charAt(0).toUpperCase()}
          </Text>
        </LinearGradient>
        
        <Text style={styles.contactName}>{item.username}</Text>
        
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Новая группа</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.inputSection}>
          <View style={styles.groupIconContainer}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryLight]}
              style={styles.groupIcon}
            >
              <Ionicons name="people" size={32} color="#FFF" />
            </LinearGradient>
          </View>
          
          <TextInput
            style={styles.groupNameInput}
            placeholder="Название группы"
            placeholderTextColor={COLORS.textSecondary}
            value={groupName}
            onChangeText={setGroupName}
            maxLength={50}
          />
        </View>

        <View style={styles.membersSection}>
          <Text style={styles.sectionTitle}>
            Участники ({selectedMembers.length} выбрано)
          </Text>
          
          {isLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : contacts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>У вас нет контактов</Text>
              <Text style={styles.emptySubtext}>
                Добавьте контакты, чтобы создать группу
              </Text>
            </View>
          ) : (
            <FlatList
              data={contacts}
              renderItem={renderContact}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.contactsList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.createButton, !canCreate && styles.createButtonDisabled]}
            onPress={handleCreateGroup}
            disabled={!canCreate || isCreating}
          >
            <LinearGradient
              colors={canCreate ? [COLORS.primary, COLORS.primaryLight] : [COLORS.surfaceLight, COLORS.surfaceLight]}
              style={styles.createButtonGradient}
            >
              {isCreating ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={24} color="#FFF" />
                  <Text style={styles.createButtonText}>Создать группу</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  inputSection: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  groupIconContainer: {
    marginBottom: 16,
  },
  groupIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupNameInput: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
  },
  membersSection: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  contactsList: {
    paddingBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  contactItemSelected: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  contactName: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  createButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  createButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
  },
});
