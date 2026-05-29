import { create } from 'zustand';
import { notifyInfo } from './uiStore';

interface ActiveMemberState {
  activeMemberId: string | null;
  activeMemberName: string;
  setActiveMember: (memberId: string | null, name: string) => void;
  clearActiveMember: () => void;
}

export const useActiveMemberStore = create<ActiveMemberState>((set, get) => ({
  activeMemberId: null,
  activeMemberName: 'Ben',

  setActiveMember: (memberId, name) => {
    const prev = get().activeMemberId;
    set({ activeMemberId: memberId, activeMemberName: name });
    if (prev !== memberId) {
      if (memberId) {
        notifyInfo(`${name} hesabina gecildi`, 'Bu profil icin islem yapiyorsunuz.');
      } else {
        notifyInfo('Aile hesabindan cikildi', 'Birincil hesaba geri donuldu.');
      }
    }
  },

  clearActiveMember: () => {
    const prev = get().activeMemberId;
    set({ activeMemberId: null, activeMemberName: 'Ben' });
    if (prev) {
      notifyInfo('Aile hesabindan cikildi', 'Birincil hesaba geri donuldu.');
    }
  },
}));
