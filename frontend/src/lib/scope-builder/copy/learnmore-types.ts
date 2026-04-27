export interface LearnMoreContent {
  title: string;
  range: string;
  leadTime: string;
  plain_english: string;
  need_this_if: string[];
  what_you_get: string[];
  skip_this_if: string[];
  common_mistakes: string[];
  how_long: string;
  pairs_with: Array<{ category: string; reason: string }>;
}
