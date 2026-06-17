import { useState, useRef, useEffect } from "react";
import { useLoaderData, useActionData, useNavigation, Form } from "react-router";
import { authenticate } from "../shopify.server";
import { getShopSettings, saveShopSettings } from "../../database/collections.js";
import { getShopLocales } from "../../backend/services/shopLocaleService.js";
import { connectToMongoDB } from "../../database/connection.js";
import "../styles/setupGuide.css";

// Common languages offered for AI-generated translations even if the
// store hasn't configured them under Settings > Languages. The AI
// translation service can generate summaries for any of these locales.
const ADDITIONAL_LANGUAGES = [
  { locale: "es", name: "Spanish" },
  { locale: "fr", name: "French" },
  { locale: "de", name: "German" },
  { locale: "it", name: "Italian" },
  { locale: "pt", name: "Portuguese" },
  { locale: "nl", name: "Dutch" },
  { locale: "ja", name: "Japanese" },
  { locale: "zh-CN", name: "Chinese (Simplified)" },
  { locale: "zh-TW", name: "Chinese (Traditional)" },
  { locale: "ar", name: "Arabic" },
  { locale: "hi", name: "Hindi" },
  { locale: "ko", name: "Korean" },
  { locale: "ru", name: "Russian" },
  { locale: "tr", name: "Turkish" },
  { locale: "pl", name: "Polish" },
  { locale: "sv", name: "Swedish" },
  { locale: "no", name: "Norwegian" },
  { locale: "da", name: "Danish" },
  { locale: "fi", name: "Finnish" },
  { locale: "el", name: "Greek" },
  { locale: "cs", name: "Czech" },
  { locale: "ro", name: "Romanian" },
  { locale: "hu", name: "Hungarian" },
  { locale: "th", name: "Thai" },
  { locale: "vi", name: "Vietnamese" },
  { locale: "id", name: "Indonesian" },
  { locale: "ms", name: "Malay" },
  { locale: "uk", name: "Ukrainian" },
  { locale: "he", name: "Hebrew" },
  { locale: "bn", name: "Bengali" },
];

export const loader = async ({ request }) => {
  const { session, admin, scopes } = await authenticate.admin(request);

  if (scopes) {
    await scopes.request(["read_locales"]);
  }

  const shop = session.shop;

  await connectToMongoDB();

  const shopLocales = await getShopLocales(admin);
  const settings = await getShopSettings(shop);

  const primaryLocale = shopLocales.find((locale) => locale.primary)?.locale || "en";

  // Offer additional common languages for AI translation beyond what the
  // store has configured under Settings > Languages.
  const extraLocales = ADDITIONAL_LANGUAGES.filter(
    (extra) => !shopLocales.some((locale) => locale.locale === extra.locale)
  ).map((extra) => ({ ...extra, primary: false, published: false }));

  const combinedLocales = [...shopLocales, ...extraLocales];

  return {
    shopLocales: combinedLocales,
    primaryLanguage: settings?.primary_language || primaryLocale,
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const primaryLanguage = formData.get("primaryLanguage");

  await connectToMongoDB();

  await saveShopSettings(shop, {
    primary_language: primaryLanguage,
  });

  return { saved: true };
};

function LanguageDropdown({ locales, defaultValue }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(defaultValue);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLocale = locales.find((l) => l.locale === selected);
  const label = selectedLocale
    ? `${selectedLocale.name} (${selectedLocale.locale})${selectedLocale.primary ? " — store default" : ""}`
    : selected;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }} ref={containerRef}>
      <label style={{ fontSize: "14px", fontWeight: 500, color: "#202223" }}>
        Primary language
      </label>
      {/* hidden input carries the value on form submit */}
      <input type="hidden" name="primaryLanguage" value={selected} />
      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{
            width: "100%",
            padding: "8px 36px 8px 12px",
            fontSize: "14px",
            border: "1px solid #8c9196",
            borderRadius: "6px",
            backgroundColor: "#fff",
            color: "#202223",
            textAlign: "left",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{label}</span>
          <svg
            style={{ pointerEvents: "none", flexShrink: 0 }}
            width="20" height="20" viewBox="0 0 20 20" fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M5 7.5L10 12.5L15 7.5" stroke="#6d7175" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <ul
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 9999,
              margin: "2px 0 0",
              padding: 0,
              listStyle: "none",
              border: "1px solid #8c9196",
              borderRadius: "6px",
              backgroundColor: "#fff",
              maxHeight: "240px",
              overflowY: "auto",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            {locales.map((locale) => {
              const optionLabel = `${locale.name} (${locale.locale})${locale.primary ? " — store default" : ""}`;
              const isSelected = locale.locale === selected;
              return (
                <li
                  key={locale.locale}
                  onClick={() => { setSelected(locale.locale); setOpen(false); }}
                  style={{
                    padding: "8px 12px",
                    fontSize: "14px",
                    cursor: "pointer",
                    backgroundColor: isSelected ? "#1a73e8" : "transparent",
                    color: isSelected ? "#fff" : "#202223",
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "#f1f2f3"; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  {optionLabel}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 16px',
  },
  card: {
    padding: '24px',
    border: '1px solid #e1e3e5',
    borderRadius: '8px',
    backgroundColor: '#fff',
  },
};

export default function LanguagesPage() {
  const { shopLocales, primaryLanguage } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";
  const currentLanguageName = shopLocales.find((locale) => locale.locale === primaryLanguage)?.name || primaryLanguage;

  return (
    <s-page heading="AI Summary Languages" inlineSize="large">
      <div className="setup-guide-wrapper">
        <div style={styles.container}>

          <s-banner tone="info">
            <s-paragraph>
              Choose the language for your AI-generated product titles and
              descriptions. This language is shown to all storefront visitors.
            </s-paragraph>
          </s-banner>

          {actionData?.saved && (
            <s-banner tone="success">
              <s-paragraph>Language settings saved.</s-paragraph>
            </s-banner>
          )}

          <div style={styles.card}>
            <s-stack direction="block" gap="base">
              <s-stack direction="inline" gap="base" inlineAlignment="space-between" blockAlignment="center">
                <s-text variant="headingMd">Language Settings</s-text>
                <s-badge tone="success">Active: {currentLanguageName}</s-badge>
              </s-stack>

              {shopLocales.length === 0 ? (
                <s-paragraph>
                  No languages found for this store. Configure languages in Shopify
                  under Settings → Languages.
                </s-paragraph>
              ) : (
                <Form method="post">
                  <s-stack direction="block" gap="base">
                    <s-paragraph>
                      Select the primary language for AI-generated summaries shown
                      to your storefront visitors.
                    </s-paragraph>

                    <LanguageDropdown locales={shopLocales} defaultValue={primaryLanguage} />

                    <s-button type="submit" variant="primary" disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save"}
                    </s-button>
                  </s-stack>
                </Form>
              )}
            </s-stack>
          </div>

        </div>
      </div>
    </s-page>
  );
}
