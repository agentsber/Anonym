import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from './colors';
import { ForwardModalProps, ForwardTarget } from './types';

export const ForwardModal: React.FC<ForwardModalProps> = ({
  visible,
  targets,
  isForwarding,
  onClose,
  onForward,
}) => {
  const renderTarget = (target: ForwardTarget) => (
    <TouchableOpacity
      key={target.id}
      style={styles.item}
      onPress={() => onForward(target)}
    >
      <LinearGradient
        colors={[
          target.avatar_color || COLORS.primary, 
          (target.avatar_color || COLORS.primary) + '99'
        ]}
        style={styles.avatar}
      >
        {target.type === 'group' ? (
          <Ionicons name="people" size={20} color="#FFF" />
        ) : (
          <Text style={styles.avatarText}>{target.avatar_letter}</Text>
        )}
      </LinearGradient>
      <View style={styles.info}>
        <Text style={styles.name}>{target.name}</Text>
        {target.member_count && (
          <Text style={styles.subtitle}>{target.member_count} участников</Text>
        )}
      </View>
      <Ionicons name="arrow-forward" size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Переслать сообщение</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        
        {isForwarding ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView style={styles.content}>
            {targets.groups.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Группы</Text>
                {targets.groups.map(renderTarget)}
              </>
            )}
            
            {targets.contacts.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Контакты</Text>
                {targets.contacts.map(renderTarget)}
              </>
            )}
            
            {targets.groups.length === 0 && targets.contacts.length === 0 && (
              <Text style={styles.empty}>Нет доступных получателей</Text>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    marginTop: 100,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
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
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  empty: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
});

export default ForwardModal;
