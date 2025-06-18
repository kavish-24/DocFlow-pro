import { create } from 'zustand';

const useStore = create((set) => ({
  user: null,
  documents: [],
  folders: [],
  profile: { name: '', email: '', role: '' },
  activities: [],
  setUser: (user) => set({ user }),
  setDocuments: (documents) => set({ documents }),
  setFolders: (folders) => set({ folders }),
  setProfile: (profile) => set({ profile }),
  setActivities: (activities) => set({ activities }),
}));

export default useStore;