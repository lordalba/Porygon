export interface TestingProfile {
    id: string;
    profileId: string,
    name: string;
    profile: string;
    services: {
      name: string;
      desiredVersion: string;
    }[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }
  