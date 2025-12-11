/**
 * Pending Chats Screen - Bekleyen sohbetler
 * Henüz kabul edilmemiş sohbet talepleri
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useChatStore } from '../store/chatStore';
import socketService from '../services/socketService';

export default function PendingChatsScreen({ navigation }) {
  const { pendingChats } = useChatStore();

  const handleAcceptChat = (chat) => {
    Alert.alert(
      'Sohbeti Kabul Et',
      `${chat.visitor?.name || 'Ziyaretçi'} ile sohbeti kabul etmek istiyor musunuz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kabul Et',
          onPress: () => {
            socketService.acceptChat(chat.chatId);
            navigation.navigate('Chat', {
              chatId: chat.chatId,
              visitorName: chat.visitor?.name || 'Ziyaretçi',
            });
          },
        },
      ]
    );
  };

  const renderPendingItem = ({ item }) => {
    const waitTime = formatDistanceToNow(new Date(item.createdAt), {
      addSuffix: false,
      locale: tr,
    });

    return (
      <View style={styles.pendingItem}>
        {/* Avatar */}
        <View style={styles.avatar}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {(item.visitor?.name || 'Z')[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.pendingIndicator} />
        </View>

        {/* Info */}
        <View style={styles.pendingContent}>
          <Text style={styles.visitorName}>
            {item.visitor?.name || 'Ziyaretçi'}
          </Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={14} color="#6B7280" />
            <Text style={styles.infoText}>Bekleme: {waitTime}</Text>
          </View>

          {item.visitor?.currentPage && (
            <View style={styles.infoRow}>
              <Ionicons name="globe-outline" size={14} color="#6B7280" />
              <Text style={styles.infoText} numberOfLines={1}>
                {item.visitor.currentPage}
              </Text>
            </View>
          )}

          {item.lastMessage?.content && (
            <View style={styles.messageBox}>
              <Ionicons name="chatbubble-outline" size={14} color="#4F46E5" />
              <Text style={styles.messageText} numberOfLines={2}>
                {item.lastMessage.content}
              </Text>
            </View>
          )}
        </View>

        {/* Accept Button */}
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAcceptChat(item)}
        >
          <Ionicons name="checkmark" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="checkmark-circle-outline" size={80} color="#10B981" />
      <Text style={styles.emptyTitle}>Bekleyen Sohbet Yok</Text>
      <Text style={styles.emptyText}>
        Tüm müşterilerinize cevap verilmiş.{'\n'}Harika iş!
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header Info */}
      {pendingChats.length > 0 && (
        <View style={styles.headerInfo}>
          <Ionicons name="information-circle" size={20} color="#F59E0B" />
          <Text style={styles.headerText}>
            {pendingChats.length} müşteri yanıt bekliyor
          </Text>
        </View>
      )}

      <FlatList
        data={pendingChats}
        keyExtractor={(item) => item.chatId}
        renderItem={renderPendingItem}
        ListEmptyComponent={renderEmptyList}
        contentContainerStyle={pendingChats.length === 0 && styles.emptyList}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    gap: 8,
  },
  headerText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },
  pendingItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    alignItems: 'flex-start',
  },
  avatar: {
    position: 'relative',
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  pendingIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F59E0B',
    borderWidth: 2,
    borderColor: '#fff',
  },
  pendingContent: {
    flex: 1,
    marginRight: 12,
  },
  visitorName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#EEF2FF',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  messageText: {
    fontSize: 14,
    color: '#4F46E5',
    flex: 1,
    lineHeight: 20,
  },
  acceptButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});
