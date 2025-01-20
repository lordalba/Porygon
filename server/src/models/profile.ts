export interface Service {
  name: string;
  version: string;
  underTest: boolean;
  podCount: number;
  note?: string;
  testGroupId?: string;
}

export interface Profile {
  id: string;
  name: string;
  namespace: string;
  services: Service[];
  clusterUrl: string;
  saToken: string;
}

export const profiles: Profile[] = [];
