// Fetches the languages a shop has configured (Settings > Languages)
export async function getShopLocales(admin) {
  const response = await admin.graphql(`#graphql
    query GetShopLocales {
      shopLocales {
        locale
        name
        primary
        published
      }
    }
  `);

  const { data } = await response.json();

  return data?.shopLocales || [];
}
