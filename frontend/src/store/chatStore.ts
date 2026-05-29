import { create } from 'zustand';
import { ChatMessage } from '../models';
import { chatAPI } from '../services/api';
import { notifyError } from './uiStore';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (text: string, memberId?: string) => Promise<void>;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,

  sendMessage: async (text: string, memberId?: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      owner_user_id: '',
      member_id: memberId,
      role: 'user',
      text: trimmed,
      created_at: new Date().toISOString(),
    };

    set((state) => ({ messages: [...state.messages, userMessage], isLoading: true }));

    try {
      const response = await chatAPI.send(trimmed, memberId);
      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-assistant`,
        owner_user_id: '',
        member_id: memberId,
        role: 'assistant',
        text: response.reply,
        risk_level: response.risk_level,
        safety_note: response.safety_note,
        suggested_actions: response.suggested_actions,
        created_at: new Date().toISOString(),
      };
      set((state) => ({ messages: [...state.messages, assistantMessage], isLoading: false }));
    } catch (error: any) {
      set({ isLoading: false });
      notifyError('Mesaj gonderilemedi', error.message);
      throw error;
    }
  },

  clearMessages: () => set({ messages: [] }),
}));
