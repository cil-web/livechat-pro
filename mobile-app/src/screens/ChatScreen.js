/**
 * Chat Screen - WhatsApp benzeri mesajlaşma ekranı
 * Gerçek zamanlı mesajlaşma, durum göstergeleri, typing indicator
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import socketService from '../services/socketService';

export default function ChatScreen({ route, navigation }) {
  const { chatId, visitorName } = route.params;
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const { messages, currentChat, setCurrentChat, resetUnread } = useChatStore();
  const { operator } = useAuthStore();
  
  const chatMessages = messages[chatId] || [];
  const visitorTyping = currentChat?.visitorTyping || false;

  useEffect(() => {
    // Sohbet açıldığında unread'i sıfırla
    resetUnread(chatId);

    // Mesajları okundu olarak işaretle
    const unreadIds = chatMessages
      .filter(m => m.sender?.type === 'visitor' && m.status !== 'read')
      .map(m => m.messageId);
    
    if (unreadIds.length > 0) {
      socketService.markAsRead(chatId, unreadIds);
    }

    return () => {
      // Ekrandan çıkınca typing'i durdur
      if (isTyping) {
        socketService.sendTyping(chatId, false);
      }
    };
  }, [chatId]);

  // Yeni mesaj geldiğinde scroll
  useEffect(() => {
    if (chatMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages.length]);

  // Input değiştiğinde typing gönder
  const handleInputChange = (text) => {
    setInputText(text);

    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      socketService.sendTyping(chatId, true);
    }

    // Typing timeout
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        socketService.sendTyping(chatId, false);
      }
    }, 2000);
  };

  // Mesaj gönder
  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;

    socketService.sendMessage(chatId, text, 'text');
    setInputText('');
    setIsTyping(false);
    socketService.sendTyping(chatId, false);
  };

  // Sohbeti kapat
  const handleCloseChat = () => {
    socketService.closeChat(chatId, 'Operatör tarafından kapatıldı');
    navigation.goBack();
  };

  // Mesaj durumu ikonu
  const getStatusIcon = (status) => {
    switch (status) {
      case 'sending':
        return <ActivityIndicator size={12} color="#9CA3AF" />;
      case 'sent':
        return <Ionicons name="checkmark" size={16} color="#9CA3AF" />;
      case 'delivered':
        return <Ionicons name="checkmark-done" size={16} color="#9CA3AF" />;
      case 'read':
        return <Ionicons name="checkmark-done" size={16} color="#4F46E5" />;
      default:
        return null;
    }
  };

  // Mesaj render
  const renderMessage = useCallback(({ item, index }) => {
    const isOperator = item.sender?.type === 'operator';
    const isSystem = item.sender?.type === 'system';
    const time = format(new Date(item.createdAt), 'HH:mm', { locale: tr });

    // Sistem mesajı
    if (isSystem) {
      return (
        <View style={styles.systemMessage}>
          <Text style={styles.systemText}>{item.content?.text}</Text>
        </View>
      );
    }

    // Tarih ayırıcı (opsiyonel - ilerisi için)
    const showDate = index === 0 || 
      format(new Date(item.createdAt), 'yyyy-MM-dd') !== 
      format(new Date(chatMessages[index - 1]?.createdAt), 'yyyy-MM-dd');

    return (
      <View>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>
              {format(new Date(item.createdAt), 'd MMMM yyyy', { locale: tr })}
            </Text>
          </View>
        )}
        
        <View style={[
          styles.messageContainer,
          isOperator ? styles.operatorMessage : styles.visitorMessage
        ]}>
          <View style={[
            styles.messageBubble,
            isOperator ? styles.operatorBubble : styles.visitorBubble
          ]}>
            <Text style={[
              styles.messageText,
              isOperator ? styles.operatorText : styles.visitorText
            ]}>
              {item.content?.text}
            </Text>
            
            <View style={styles.messageFooter}>
              <Text style={[
                styles.messageTime,
                isOperator ? styles.operatorTime : styles.visitorTime
              ]}>
                {time}
              </Text>
              {isOperator && (
                <View style={styles.statusIcon}>
                  {getStatusIcon(item.status)}
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  }, [chatMessages]);

  // Header right button
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleCloseChat} style={styles.headerButton}>
          <Ionicons name="close-circle-outline" size={26} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Mesaj Listesi */}
      <FlatList
        ref={flatListRef}
        data={chatMessages}
        keyExtractor={(item) => item.messageId}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Ionicons name="chatbubble-ellipses-outline" size={60} color="#D1D5DB" />
            <Text style={styles.emptyChatText}>Sohbet başladı</Text>
          </View>
        }
      />

      {/* Typing Indicator */}
      {visitorTyping && (
        <View style={styles.typingContainer}>
          <View style={styles.typingBubble}>
            <View style={styles.typingDots}>
              <View style={[styles.dot, styles.dot1]} />
              <View style={[styles.dot, styles.dot2]} />
              <View style={[styles.dot, styles.dot3]} />
            </View>
            <Text style={styles.typingText}>{visitorName} yazıyor...</Text>
          </View>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Mesajınızı yazın..."
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={handleInputChange}
            multiline
            maxLength={5000}
          />
          
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="attach" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Ionicons name="send" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5E7EB',
  },
  headerButton: {
    marginRight: 8,
    padding: 4,
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 8,
    maxWidth: '80%',
  },
  operatorMessage: {
    alignSelf: 'flex-end',
  },
  visitorMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  operatorBubble: {
    backgroundColor: '#4F46E5',
    borderBottomRightRadius: 4,
  },
  visitorBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  operatorText: {
    color: '#fff',
  },
  visitorText: {
    color: '#1F2937',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  operatorTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  visitorTime: {
    color: '#9CA3AF',
  },
  statusIcon: {
    marginLeft: 2,
  },
  systemMessage: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginVertical: 8,
  },
  systemText: {
    fontSize: 13,
    color: '#6B7280',
  },
  dateSeparator: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginVertical: 16,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyChatText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9CA3AF',
  },
  typingContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 8,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9CA3AF',
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
  typingText: {
    fontSize: 13,
    color: '#6B7280',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 48,
    maxHeight: 120,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    maxHeight: 100,
    paddingTop: 8,
    paddingBottom: 8,
  },
  attachButton: {
    padding: 4,
    marginLeft: 8,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
});
