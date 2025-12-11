/**
 * Chats List Screen - Aktif sohbetler listesi
 * WhatsApp benzeri sohbet listesi
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useChatStore } from '../store/chatStore';
import socketService from '../services/socketService';

export default function ChatsListScreen({ navigation }) {
  const { activeChats, currentChat, setCurrentChat, resetUnread } = useChatStore();

  useEffect(() => {
    // Socket bağlantısını kontrol et
    if (!socketService.isConnected) {
      socketService.connect();
    }
  }, []);

  const handleChatPress = (chat) => {
    setCurrentChat(chat);
    resetUnread(chat.chatId);
    navigation.navigate('Chat', {
      chatId: chat.chatId,
      visitorName: chat.visitor?.name || 'Ziyaretçi',
    });
  };

  const renderChatItem = ({ item }) => {
    const lastMessageTime = item.lastMessage?.timestamp
      ? formatDistanceToNow(new Date(item.lastMessage.timestamp), {
          addSuffix: true,
          locale: tr,
        })
      : '';

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => handleChatPress(item)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={styles.avatar}>
          {item.visitor?.avatar ? (
            <Image source={{ uri: item.visitor.avatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {(item.visitor?.name || 'Z')[0].toUpperCase()}
              </Text>
            </View>
          )}
          {item.visitorTyping && (
            <View style={styles.typingDot} />
          )}
        </View>

        {/* Content */}
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.visitorName} numberOfLines={1}>
              {item.visitor?.name || 'Ziyaretçi'}
            </Text>
            <Text style={styles.time}>{lastMessageTime}</Text>
          </View>

          <View style={styles.chatFooter}>
            <View style={styles.messagePreview}>
              {item.lastMessage?.sender === 'operator' && (
                <Ionicons 
                  name="checkmark-done" 
                  size={16} 
                  color="#4F46E5" 
                  style={styles.checkIcon}
                />
              )}
              <Text style={styles.lastMessage} numberOfLines={1}>
                {item.visitorTyping 
                  ? 'yazıyor...' 
                  : item.lastMessage?.content || 'Sohbet başladı'}
              </Text>
            </View>

            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {item.unreadCount > 9 ? '9+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={80} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>Aktif Sohbet Yok</Text>
      <Text style={styles.emptyText}>
        Bekleyen sohbetlerden birini kabul ederek{'\n'}müşterilerinize destek verin.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={activeChats}
        keyExtractor={(item) => item.chatId}
        renderItem={renderChatItem}
        ListEmptyComponent={renderEmptyList}
        contentContainerStyle={activeChats.length === 0 && styles.emptyList}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
  },
  avatar: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  avatarPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
  },
  typingDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#fff',
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  visitorName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 13,
    color: '#6B7280',
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  checkIcon: {
    marginRight: 4,
  },
  lastMessage: {
    fontSize: 15,
    color: '#6B7280',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginLeft: 82,
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
