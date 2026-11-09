import { createFollowerEmail, readAuthData } from '@data/common/auth-data';
import { expect, test } from '@fixtures/test';
import { step } from '@helpers/step';
import { autoCloseNewsletterPopup } from '@pages/components/newsletter-popup';
import { GuideProfilePage } from '@pages/localite/guide-profile-page';

test('FOL-001 | Visitor follows a localite by email from the public profile', { tag: ['@localite'] }, async ({
  page, browser, session, localite, guideProfilePage,
}) => {
  test.setTimeout(90_000);

  // Pre-setup: a unique follower email (Follower Email + 6 random digits).
  const followerEmail = createFollowerEmail(await readAuthData());
  test.info().annotations.push(
    { type: 'Localite email', description: localite.email },
    { type: 'Follower email', description: followerEmail },
  );

  // Step 1: Sign in as the localite to find the profile slug (/guide_detailed_page/<slug>).
  // The localite's own profile has no Follow button, so following is done as a visitor.
  let publicProfileUrl = '';
  await step('Sign in as localite and get the public profile URL', async () => {
    await session.signIn(localite);
    await expect(page).toHaveURL(/guide_detailed_page/, { timeout: 60_000 });
    await expect(guideProfilePage.dashboardLink).toBeVisible();
    const slug = new URL(page.url()).pathname.split('/').filter(Boolean).pop();
    publicProfileUrl = new URL(`/local-guides/${slug}`, page.url()).toString();
  });
  test.info().annotations.push({ type: 'Public profile', description: publicProfileUrl });

  // A signed-out visitor in a separate browser context.
  const visitorContext = await browser.newContext();
  const visitorPage = await visitorContext.newPage();
  await autoCloseNewsletterPopup(visitorPage);
  const visitorProfile = new GuideProfilePage(visitorPage);

  try {
    // Step 2: Open the public profile, click Follow, and verify the Join the Journey dialog.
    await step('Open the Join the Journey dialog', async () => {
      await visitorPage.goto(publicProfileUrl);
      await visitorProfile.openFollowDialog();
    });

    // Step 3: Enter an email and click Follow.
    await step('Follow with email', async () => {
      await visitorProfile.followWithEmail(followerEmail);
    });

    // Step 4: Verify the success message and that the visitor is back on the profile.
    await step('Verify follow succeeded', async () => {
      await expect(visitorProfile.followSuccessMessage).toBeVisible();
      await expect(visitorProfile.joinJourneyDialog).toBeHidden();
      await expect(visitorPage).toHaveURL(publicProfileUrl);
      await expect(visitorProfile.followButton).toBeVisible();
    });
  } finally {
    await visitorContext.close();
  }
});
