import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('sign-in page presents email/password authentication without public registration', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByLabel(/work email/i)).toBeVisible()
  await expect(page.getByLabel(/password/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /sign up|create account/i })).toHaveCount(0)
})

test('driver workspace redirects unauthenticated visitors to sign-in', async ({ page }) => {
  await page.goto('/driver')
  await expect(page).toHaveURL(/\/login$/)
})

test('sign-in page has no WCAG 2.1 AA violations', async ({ page }) => {
  await page.goto('/login')
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])
})
