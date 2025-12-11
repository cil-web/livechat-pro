/**
 * Settings Screen - Operatör ayarları
 * Profil, durum, bildirimler, çıkış
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import socketService from '../services/socketService';

export default function SettingsScreen() {
  const { operator, logout, updateProfile, setStatus } = useAuthStore();
  const { reset: resetChat } = useChatStore();
  
  const [notifications, setNotifications] = useState(true);
  const [sound, setSound] = useState(true);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [serverUrl, setServerUrl] = useState('http://localhost:3000');

  const statusOptions = [
    { id: 'available', label: 'Müsait', color: '#10B981', icon: 'checkmark-circle' },
    { id: 'busy', label: 'Meşgul', color: '#EF4444', icon: 'close-circle' },
    { id: 'away', label: 'Uzakta', color: '#F59E0B', icon: 'time' },
  ];

  const currentStatus = statusOptions.find(s => s.id === operator?.status) || statusOptions[0];

  const handleStatusChange = (status) => {
    setStatus(status);
    socketService.setStatus(status);
    setStatusModalVisible(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: () => {
            socketService.disconnect();
            resetChat();
            logout();
          },
        },
      ]
    );
  };

  const handleServerChange = () => {
    socketService.setServerUrl(serverUrl);
    socketService.disconnect();
    socketService.connect();
    setServerModalVisible(false);
    Alert.alert('Başarılı', 'Sunucu adresi güncellendi');
  };

  const SettingItem = ({ icon, title, subtitle, onPress, rightComponent, color = '#4F46E5' }) => (
    <TouchableOpacity 
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightComponent || (onPress && (
        <Ionicons name="chevron-forward" size={22} color="#9CA3AF" />
      ))}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Profil Kartı */}
      <View style={styles.profileCard}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarTextLarge}>
            {(operator?.name || 'O')[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.profileName}>{operator?.name || 'Operatör'}</Text>
        <Text style={styles.profileEmail}>{operator?.email}</Text>
        
        <TouchableOpacity 
          style={[styles.statusBadge, { backgroundColor: `${currentStatus.color}20` }]}
          onPress={() => setStatusModalVisible(true)}
        >
          <View style={[styles.statusDot, { backgroundColor: currentStatus.color }]} />
          <Text style={[styles.statusText, { color: currentStatus.color }]}>
            {currentStatus.label}
          </Text>
          <Ionicons name="chevron-down" size={16} color={currentStatus.color} />
        </TouchableOpacity>
      </View>

      {/* Ayarlar Grupları */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bildirimler</Text>
        
        <SettingItem
          icon="notifications"
          title="Push Bildirimleri"
          subtitle="Yeni mesaj bildirimlerini al"
          color="#4F46E5"
          rightComponent={
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#D1D5DB', true: '#4F46E5' }}
              thumbColor="#fff"
            />
          }
        />
        
        <SettingItem
          icon="volume-high"
          title="Bildirim Sesi"
          subtitle="Sesli uyarıları aç/kapat"
          color="#10B981"
          rightComponent={
            <Switch
              value={sound}
              onValueChange={setSound}
              trackColor={{ false: '#D1D5DB', true: '#10B981' }}
              thumbColor="#fff"
            />
          }
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Uygulama</Text>
        
        <SettingItem
          icon="server"
          title="Sunucu Adresi"
          subtitle={serverUrl}
          color="#F59E0B"
          onPress={() => setServerModalVisible(true)}
        />
        
        <SettingItem
          icon="language"
          title="Dil"
          subtitle="Türkçe"
          color="#6366F1"
          onPress={() => Alert.alert('Yakında', 'Dil seçeneği yakında eklenecek')}
        />
        
        <SettingItem
          icon="moon"
          title="Karanlık Mod"
          subtitle="Sistem ayarlarını kullan"
          color="#374151"
          onPress={() => Alert.alert('Yakında', 'Karanlık mod yakında eklenecek')}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Destek</Text>
        
        <SettingItem
          icon="help-circle"
          title="Yardım Merkezi"
          color="#06B6D4"
          onPress={() => Alert.alert('Yardım', 'Yardım merkezi yakında eklenecek')}
        />
        
        <SettingItem
          icon="information-circle"
          title="Hakkında"
          subtitle="Sürüm 1.0.0"
          color="#8B5CF6"
          onPress={() => Alert.alert('LiveChat Pro', 'Sürüm 1.0.0\n\nWhatsApp benzeri canlı destek uygulaması')}
        />
      </View>

      {/* Çıkış Butonu */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="#EF4444" />
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>LiveChat Pro © 2024</Text>
      </View>

      {/* Durum Modal */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setStatusModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Durum Seç</Text>
            
            {statusOptions.map((status) => (
              <TouchableOpacity
                key={status.id}
                style={[
                  styles.statusOption,
                  currentStatus.id === status.id && styles.statusOptionActive
                ]}
                onPress={() => handleStatusChange(status.id)}
              >
                <Ionicons name={status.icon} size={24} color={status.color} />
                <Text style={[styles.statusOptionText, { color: status.color }]}>
                  {status.label}
                </Text>
                {currentStatus.id === status.id && (
                  <Ionicons name="checkmark" size={24} color={status.color} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Server URL Modal */}
      <Modal
        visible={serverModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setServerModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setServerModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sunucu Adresi</Text>
            
            <TextInput
              style={styles.serverInput}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://localhost:3000"
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButtonCancel}
                onPress={() => setServerModalVisible(false)}
              >
                <Text style={styles.modalButtonCancelText}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalButtonSave}
                onPress={handleServerChange}
              >
                <Text style={styles.modalButtonSaveText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  profileCard: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarTextLarge: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '600',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  statusOptionActive: {
    backgroundColor: '#F3F4F6',
  },
  statusOptionText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
  },
  serverInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalButtonSave: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
  },
  modalButtonSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
