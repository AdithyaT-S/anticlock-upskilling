import { test as base } from '@playwright/test'

type AuthFixtures = {
  authenticatedPage: typeof base extends { extend: (fixtures: infer F) => unknown } ? F : never
}

export const test = base.extend<{ storageState: string }>({
  storageState: async ({}, use) => {
    await use('src/tests/fixtures/.auth/user.json')
  },
})

export const adminUser = {
  email: 'admin@test-org.com',
  password: 'testpassword123',
  full_name: 'Test Admin',
  org_name: 'Test Org',
}

export const memberUser = {
  email: 'member@test-org.com',
  password: 'testpassword123',
  full_name: 'Test Member',
}
