export default class MapRecords {
  data() {
    return {
      permalink: "/assets/map-records.json",
      eleventyExcludeFromCollections: true,
    };
  }

  render({ collections }) {
    const bounds = {
      west: -102.15,
      south: 46.23,
      east: -100.02,
      north: 47.38,
    };

    const records = collections.records
      .filter(({ data }) => {
        const { latitude, longitude } = data.place ?? {};
        return (
          Number.isFinite(latitude) &&
          Number.isFinite(longitude) &&
          longitude >= bounds.west &&
          longitude <= bounds.east &&
          latitude >= bounds.south &&
          latitude <= bounds.north
        );
      })
      .map(({ data, url }) => ({
        title: data.card?.title ?? data.title,
        image: data.card?.image ?? null,
        imageAlt: data.card?.imageAlt ?? "",
        category: data.place.collection,
        latitude: data.place.latitude,
        longitude: data.place.longitude,
        url,
      }));

    return JSON.stringify(records);
  }
}
