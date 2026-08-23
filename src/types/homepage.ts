export interface HomepageHero {
  image: string;
  imageMobile: string;
  imageAlt: string;
  title: string;
  subtitle: string;
  caption: string;
  ctaLabel: string;
  ctaUrl: string;
}

export interface HomepageShowcaseSpec {
  label: string;
  value: string;
}

export interface HomepageShowcase {
  id: string;
  order: number;
  product: { slug: string; name: string } | null;
  image: string;
  imageAlt: string;
  title: string;
  description: string;
  specs: HomepageShowcaseSpec[];
  ctaLabel: string;
  ctaUrl: string;
  theme: "light" | "dark";
}

export interface HomepageCommunityTile {
  id: string;
  order: number;
  image: string;
  imageAlt: string;
  linkUrl: string;
}

export interface HomepageContent {
  hero: HomepageHero | null;
  showcases: HomepageShowcase[];
  communityTiles: HomepageCommunityTile[];
}
