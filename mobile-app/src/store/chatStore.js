/**
 * Chat Store - Zustand ile sohbet state yönetimi
 */

import { create } from 'zustand';

export const useChatStore = create((set, get) => ({
  // State
  activeChats: [],      // Operatörün aktif sohbetleri
  pendingChats: [],     // Bekleyen sohbetler
  currentChat: null,    // Açık olan sohbet
  messages: {},         // chatId -> messages array
  onlineOperators: [],  // Online operatörler
  isLoading: false,

  // Actions
  setActiveChats: (chats) => {
    set({ activeChats: chats });
  },

  setPendingChats: (chats) => {
    set({ pendingChats: chats });
  },

  addPendingChat: (chat) => {
    set((state) => ({
      pendingChats: [chat, ...state.pendingChats],
    }));
  },

  removePendingChat: (chatId) => {
    set((state) => ({
      pendingChats: state.pendingChats.filter((c) => c.chatId !== chatId),
    }));
  },

  setCurrentChat: (chat) => {
    set({ currentChat: chat });
  },

  acceptChat: (chatId, chatData) => {
    set((state) => ({
      pendingChats: state.pendingChats.filter((c) => c.chatId !== chatId),
      activeChats: [chatData, ...state.activeChats],
      currentChat: chatData,
    }));
  },

  closeChat: (chatId) => {
    set((state) => ({
      activeChats: state.activeChats.filter((c) => c.chatId !== chatId),
      currentChat: state.currentChat?.chatId === chatId ? null : state.currentChat,
    }));
  },

  // Mesaj yönetimi
  setMessages: (chatId, messages) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: messages,
      },
    }));
  },

  addMessage: (chatId, message) => {
    set((state) => {
      const currentMessages = state.messages[chatId] || [];
      return {
        messages: {
          ...state.messages,
          [chatId]: [...currentMessages, message],
        },
      };
    });

    // Aktif sohbet listesinde son mesajı güncelle
    set((state) => ({
      activeChats: state.activeChats.map((chat) =>
        chat.chatId === chatId
          ? {
              ...chat,
              lastMessage: {
                content: message.content?.text?.substring(0, 100),
                sender: message.sender?.type,
                timestamp: message.createdAt,
              },
            }
          : chat
      ),
    }));
  },

  updateMessageStatus: (chatId, messageId, status) => {
    set((state) => {
      const messages = state.messages[chatId] || [];
      return {
        messages: {
          ...state.messages,
          [chatId]: messages.map((msg) =>
            msg.messageId === messageId ? { ...msg, status } : msg
          ),
        },
      };
    });
  },

  // Typing durumu
  setTyping: (chatId, isTyping, userType) => {
    set((state) => {
      if (userType === 'visitor') {
        return {
          activeChats: state.activeChats.map((chat) =>
            chat.chatId === chatId
              ? { ...chat, visitorTyping: isTyping }
              : chat
          ),
        };
      }
      return state;
    });
  },

  // Online operatörler
  setOnlineOperators: (operators) => {
    set({ onlineOperators: operators });
  },

  addOnlineOperator: (operator) => {
    set((state) => ({
      onlineOperators: [...state.onlineOperators, operator],
    }));
  },

  removeOnlineOperator: (operatorId) => {
    set((state) => ({
      onlineOperators: state.onlineOperators.filter((op) => op.id !== operatorId),
    }));
  },

  // Unread count
  incrementUnread: (chatId) => {
    set((state) => ({
      activeChats: state.activeChats.map((chat) =>
        chat.chatId === chatId
          ? { ...chat, unreadCount: (chat.unreadCount || 0) + 1 }
          : chat
      ),
    }));
  },

  resetUnread: (chatId) => {
    set((state) => ({
      activeChats: state.activeChats.map((chat) =>
        chat.chatId === chatId ? { ...chat, unreadCount: 0 } : chat
      ),
    }));
  },

  // Reset
  reset: () => {
    set({
      activeChats: [],
      pendingChats: [],
      currentChat: null,
      messages: {},
      onlineOperators: [],
    });
  },
}));
