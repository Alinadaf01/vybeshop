export interface CatalogFile {
  title: string;
  description: string;
  fileUrl: string;
  fileSizeMb: number;
  pageCount: number;
  updatedAt: string;
}

export const catalog: CatalogFile = {
  title: "کاتالوگ محصولات VYBE",
  description: "کاتالوگ کامل محصولات VYBE با مشخصات فنی، ابعاد و رنگ‌بندی هر مدل.",
  fileUrl: "/catalog/vybe-catalog.pdf",
  fileSizeMb: 8.4,
  pageCount: 32,
  updatedAt: "2026-06-01",
};
