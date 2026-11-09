
import { expect, type Locator, type Page } from '@playwright/test';
import { ProfileSharingDialog } from '../components/profile-sharing-dialog';

/** Page Object for links and experience entries on a guide's profile page. */
export class GuideProfilePage {
  /** Profile Sharing dialog opened by Share Profile. */
  readonly shareDialog: ProfileSharingDialog;

  constructor(private readonly page: Page) {
    this.shareDialog = new ProfileSharingDialog(page);
  }

  /** Navigation link shown after a guide signs in. */
  get dashboardLink(): Locator {
    return this.page.getByRole('link', { name: 'Dashboard' });
  }

  /** Opens the experience creation form from the guide profile. */
  get createExperienceLink(): Locator {
    return this.page.getByRole('link', {
      name: 'Create Experience',
      exact: true,
    });
  }

  /** Opens the gallery creation form from the guide profile. */
  get createGalleryLink(): Locator {
    return this.page.getByRole('link', {
      name: 'Create Gallery',
      exact: true,
    });
  }

  /** Opens the Preview Profile page. */
  get previewProfileLink(): Locator {
    return this.page.getByRole('link', {
      name: 'Preview Profile',
      exact: true,
    });
  }

  get shareProfileButton(): Locator {
    return this.page
      .getByRole('main')
      .getByRole('button', { name: 'Share Profile', exact: true });
  }

  get editProfileLink(): Locator {
    return this.page.getByRole('link', { name: 'Edit Profile', exact: true });
  }

  /** "About" section of the profile. */
  get aboutSection(): Locator {
    return this.page.locator('#guide-about');
  }

  /** Verify name, bio, and hosted experiences shown on the profile. */
  async verifyProfileDetails(expected: {
    firstName: string;
    lastName: string;
    bio: string;
    experiences: string[];
  }): Promise<void> {
    const fullName = `${expected.firstName} ${expected.lastName}`;
    const main = this.page.getByRole('main');

    await expect(main.getByRole('heading', { level: 4, name: fullName, exact: true })).toBeVisible();
    await expect(
      this.aboutSection.getByRole('heading', { name: `About ${fullName}`, exact: true }),
    ).toBeVisible();
    await expect(this.aboutSection.getByText(expected.bio, { exact: true })).toBeVisible();

    // Experiences are shown on one line, e.g. "A, B and C".
    let experiencesLine = main.locator('p');
    for (const experience of expected.experiences) {
      experiencesLine = experiencesLine.filter({ hasText: experience });
    }
    await expect(experiencesLine.first()).toBeVisible();
    // Remove each expected name (names like "Food and Beverage" contain "and"),
    // then only separators should remain, so no old experience is still listed.
    let leftover = await experiencesLine.first().innerText();
    for (const experience of expected.experiences) {
      leftover = leftover.replace(experience, '');
    }
    expect(
      leftover.replace(/,|\band\b|\s/g, ''),
      `Unexpected experiences on the profile: "${leftover.trim()}"`,
    ).toBe('');
  }

  /**
   * Follow button on a localite's public profile (/local-guides/<slug>), named e.g. "Follow Hoa"
   * or "Unfollow Hoa"; both open Join the Journey. The localite's own profile has no Follow button.
   */
  get followButton(): Locator {
    return this.page
      .getByRole('main')
      .getByRole('button', { name: /^(Follow|Unfollow)\b/ });
  }

  /** "Join the Journey" dialog for following a localite by email. */
  get joinJourneyDialog(): Locator {
    return this.page.getByRole('dialog').filter({
      has: this.page.getByRole('heading', { name: 'Join the Journey' }),
    });
  }

  /** Success message shown after following a localite. */
  get followSuccessMessage(): Locator {
    return this.page.getByText(/Localite has been followed successfully/i);
  }

  /** Open the Join the Journey dialog from the profile Follow button. */
  async openFollowDialog(): Promise<void> {
    // The button has no label or action until the page has loaded the follow status, and a click
    // in that moment does nothing. Retry until the dialog opens (opening it twice is harmless).
    await expect(this.followButton).toBeVisible({ timeout: 30_000 });
    await expect(async () => {
      if (!(await this.joinJourneyDialog.isVisible())) {
        await this.followButton.click();
      }
      await expect(this.joinJourneyDialog).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 30_000 });
    await expect(this.joinJourneyDialog.getByText('Follow with Your Email')).toBeVisible();
  }

  /** Enter an email in Join the Journey and submit Follow. */
  async followWithEmail(email: string): Promise<void> {
    await this.joinJourneyDialog.getByRole('textbox', { name: 'you@company.com' }).fill(email);
    await this.joinJourneyDialog.getByRole('button', { name: 'Follow', exact: true }).click();
  }

  /** Gallery section of the profile. */
  get gallerySection(): Locator {
    return this.page.locator('#guide-gallery');
  }

  /** Gallery card link in the profile Gallery section, matched by exact title. */
  galleryLink(title: string): Locator {
    return this.gallerySection.getByRole('link', { name: title, exact: true });
  }

  /** Return to the profile and verify that the gallery is displayed in the Gallery section. */
  async verifyGalleryDisplayed(profileUrl: string, title: string): Promise<void> {
    await this.page.goto(profileUrl);

    const gallery = this.galleryLink(title);
    await expect(gallery).toBeVisible({ timeout: 30_000 });
    await expect(gallery).toHaveAttribute('href', /\/view-gallery\/\d+/);
    await expect(
      gallery.getByRole('heading', { name: title, exact: true }),
    ).toBeVisible();
  }

  /** Find the profile entry for an experience by its exact title. */
  experienceLink(title: string): Locator {
    return this.page.getByRole('link', { name: title, exact: true });
  }

  /** Expands the profile list when not all experiences are initially shown. */
  get showMoreExperiencesLink(): Locator {
    return this.page.getByRole('link', {
      name: 'Show more',
      exact: true,
    });
  }

  /** Return to the profile and verify that the published experience is displayed. */
  async verifyPublishedExperience(
    profileUrl: string,
    title: string,
  ): Promise<void> {
    // Return to the guide profile.
    await this.page.goto(profileUrl);

    // Find the experience by its unique title.
    let experience = this.experienceLink(title);

    // Expand the list if the experience is not initially displayed.
    if (await experience.count() === 0) {
      if (await this.showMoreExperiencesLink.isVisible().catch(() => false)) {
        await this.showMoreExperiencesLink.click();
        experience = this.experienceLink(title);
      }
    }

    // Verify that the experience is visible and links to its detail page.
    await expect(experience).toBeVisible({ timeout: 30_000 });
    await expect(experience).toHaveAttribute(
      'href',
      /find-tourist-guide\/details\/experience-/,
    );

    // Confirm that the experience title is displayed as a heading.
    await expect(
      experience.getByRole('heading', { name: title, exact: true }),
    ).toBeVisible();
  }
}
