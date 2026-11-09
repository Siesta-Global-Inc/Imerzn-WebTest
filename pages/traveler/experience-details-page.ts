import { expect, type Locator, type Page } from '@playwright/test';
import { escapeRegExp } from '@helpers/text';

/** Page Object for an experience details page (/find-tourist-guide/details/...). */
export class ExperienceDetailsPage {
  constructor(private readonly page: Page) {}

  private get main(): Locator {
    return this.page.getByRole('main');
  }

  /** Icon row under the title: Save to Wishlist, Share, and Like. */
  get iconBar(): Locator {
    return this.main
      .locator('div')
      .filter({ has: this.page.getByRole('button', { name: 'Save to Wishlist' }) })
      .filter({ has: this.page.locator('button.like-thumb') })
      .last();
  }

  get saveToWishlistButton(): Locator {
    return this.iconBar.getByRole('button', { name: 'Save to Wishlist' });
  }

  /** Share icon: a clickable icon with no text or label, between the heart and the thumbs-up. */
  get shareIcon(): Locator {
    return this.iconBar.locator(':scope > div.cursor-pointer');
  }

  /** Like button; its label switches between "Like" and "Unlike". */
  get likeButton(): Locator {
    return this.iconBar.locator('button.like-thumb');
  }

  /** Like count next to the thumbs-up; not shown while the count is 0. */
  get likeCount(): Locator {
    return this.iconBar.locator('button.like-thumb + p');
  }

  // The page shows Book Experience and Message / Plan My Trip twice: under the title and again
  // in the side price card (#exp-card-cta-slot). Both open the same dialog; use the one under the title.
  get bookExperienceButton(): Locator {
    return this.main.getByRole('button', { name: 'Book Experience', exact: true }).first();
  }

  get messageButton(): Locator {
    return this.main.getByRole('button', { name: 'Message / Plan My Trip', exact: true }).first();
  }

  get createFirstWishlistDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: 'Create your first wishlist' });
  }

  get experienceSharingDialog(): Locator {
    return this.page.getByRole('dialog').filter({
      has: this.page.getByRole('heading', { name: 'Experience Sharing' }),
    });
  }

  async expectOpened(title: string): Promise<void> {
    await expect(this.page).toHaveURL(/\/find-tourist-guide\/details\//);
    await expect(this.main.getByRole('heading', { level: 1, name: title, exact: true })).toBeVisible();
  }

  /** Click Save to Wishlist and verify "Create your first wishlist" opens, then close it. */
  async verifyCreateFirstWishlistDialog(): Promise<void> {
    await this.saveToWishlistButton.click();
    await expect(this.createFirstWishlistDialog).toBeVisible();
    await expect(this.createFirstWishlistDialog.getByRole('button', { name: 'Create & save' })).toBeVisible();

    await this.createFirstWishlistDialog.getByRole('button', { name: 'Close' }).click();
    await expect(this.createFirstWishlistDialog).toBeHidden();
  }

  /** Click Share and verify Experience Sharing shows the localite name and description, then close it. */
  async verifyExperienceSharingDialog(localiteName: string, description: string): Promise<void> {
    await this.shareIcon.click();
    const dialog = this.experienceSharingDialog;
    await expect(dialog).toBeVisible();
    // The heading is the localite name, followed by "(Business name)" once the localite has one.
    await expect(dialog.getByRole('heading', {
      level: 5,
      name: new RegExp(`^${escapeRegExp(localiteName)}( \\(.+\\))?$`),
    })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Experience Description' })).toBeVisible();
    await expect(dialog.getByText(description, { exact: true })).toBeVisible();

    await dialog.locator('button.btn-close').click();
    await expect(dialog).toBeHidden();
  }

  /**
   * Like the experience and verify the count goes up by one (to 1 for a new experience).
   * If this traveler already liked it, unlike first so the test always clicks Like.
   */
  async likeAndVerifyCount(): Promise<number> {
    await expect(this.likeButton).toBeVisible();
    if ((await this.likeButton.getAttribute('aria-pressed')) === 'true') {
      await this.likeButton.click();
      await expect(this.likeButton).toHaveAttribute('aria-pressed', 'false');
    }

    const before = (await this.likeCount.count()) > 0
      ? Number((await this.likeCount.textContent())?.trim() || 0)
      : 0;

    await this.likeButton.click();
    await expect(this.likeButton).toHaveAttribute('aria-pressed', 'true');
    await expect(this.likeButton).toHaveAttribute('aria-label', 'Unlike');
    await expect(this.likeCount).toHaveText(String(before + 1));
    return before + 1;
  }

  /** Click Message / Plan My Trip and verify the Write message form opens. */
  async verifyWriteMessageOpens(): Promise<void> {
    await this.messageButton.click();
    await expect(this.page).toHaveURL(/\/dashboard\/messages/, { timeout: 30_000 });
    await expect(this.page.getByRole('heading', { name: 'Write message', exact: true })).toBeVisible();
  }
}
