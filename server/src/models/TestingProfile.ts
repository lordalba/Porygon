export interface TestingProfile {
    id: string;
    name: string;
    namespace: string;
    services: {
      name: string;
      desiredVersion: string;
      desiredPodCount: number;
    }[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }
  