import { getTranslations } from "next-intl/server";
import { buttonStyles } from "@/components/ui";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <Link href="/" className={`${buttonStyles.primary} mt-8`}>
        {t("back")}
      </Link>
    </div>
  );
}
