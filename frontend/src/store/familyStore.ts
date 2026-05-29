import { create } from 'zustand';
import { FamilyMember } from '../models';
import { familyAPI } from '../services/api';
import { useActiveMemberStore } from './activeMemberStore';
import { notifyError, notifySuccess } from './uiStore';

interface FamilyState {
  members: FamilyMember[];
  isLoading: boolean;
  fetchMembers: () => Promise<void>;
  addMember: (data: Partial<FamilyMember>) => Promise<FamilyMember>;
  updateMember: (id: string, data: Partial<FamilyMember>) => Promise<FamilyMember>;
  deleteMember: (id: string) => Promise<void>;
}

export const useFamilyStore = create<FamilyState>((set) => ({
  members: [],
  isLoading: false,

  fetchMembers: async () => {
    set({ isLoading: true });
    try {
      const members = await familyAPI.getAll();
      set({ members, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      notifyError('Aile bireyleri yuklenemedi', error.message);
      throw error;
    }
  },

  addMember: async (data) => {
    try {
      const member = await familyAPI.create(data);
      set((state) => ({ members: [member, ...state.members] }));
      notifySuccess('Aile bireyi eklendi', `${member.name} profili hazir.`);
      return member;
    } catch (error: any) {
      notifyError('Aile bireyi eklenemedi', error.message);
      throw error;
    }
  },

  updateMember: async (id, data) => {
    try {
      const member = await familyAPI.update(id, data);
      set((state) => ({ members: state.members.map((item) => (item.id === id ? member : item)) }));
      if (useActiveMemberStore.getState().activeMemberId === id) {
        useActiveMemberStore.getState().setActiveMember(member.id, member.name);
      }
      notifySuccess('Aile bireyi guncellendi', `${member.name} bilgileri kaydedildi.`);
      return member;
    } catch (error: any) {
      notifyError('Aile bireyi guncellenemedi', error.message);
      throw error;
    }
  },

  deleteMember: async (id) => {
    const memberName = useFamilyStore.getState().members.find((item) => item.id === id)?.name || 'Aile bireyi';
    try {
      await familyAPI.delete(id);
      set((state) => ({ members: state.members.filter((item) => item.id !== id) }));
      if (useActiveMemberStore.getState().activeMemberId === id) {
        useActiveMemberStore.getState().clearActiveMember();
      }
      notifySuccess('Aile bireyi silindi', `${memberName} profili kaldirildi.`);
    } catch (error: any) {
      notifyError('Aile bireyi silinemedi', error.message);
      throw error;
    }
  },
}));
