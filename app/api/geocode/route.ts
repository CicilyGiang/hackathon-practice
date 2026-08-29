type GeocodeResult = {
  lat: string;
  lon: string;
  display_name: string;
  address?: { postcode?: string };
};

type CachedLocation = {
  lat: number;
  lng: number;
  displayName: string;
};

const cache = new Map<string, CachedLocation>();

export async function POST(request: Request) {
  let body: { address?: unknown };

  try {
    body = await request.json() as { address?: unknown };
  } catch {
    return Response.json({ message: 'Please enter a valid street address.' }, { status: 400 });
  }

  const address = typeof body.address === 'string' ? body.address.trim() : '';
  if (address.length < 5 || address.length > 250) {
    return Response.json({ message: 'Enter a complete Australian street address.' }, { status: 400 });
  }

  const cacheKey = address.toLocaleLowerCase('en-AU').replace(/\s+/g, ' ');
  const cached = cache.get(cacheKey);
  if (cached) return Response.json(cached);

  const query = /australia/i.test(address) ? address : `${address}, Australia`;
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '5');
  url.searchParams.set('countrycodes', 'au');
  url.searchParams.set('addressdetails', '1');

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en-AU,en;q=0.9',
        'User-Agent': 'SidequestCampusEvents/0.1 (local hackathon demo)',
      },
    });

    if (!response.ok) throw new Error(`Geocoder returned ${response.status}`);
    const results = await response.json() as GeocodeResult[];
    const requestedPostcode = address.match(/\b\d{4}\b/)?.[0];
    const first = requestedPostcode
      ? results.find(result => result.address?.postcode === requestedPostcode)
      : results[0];
    const lat = Number(first?.lat);
    const lng = Number(first?.lon);

    if (!first || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return Response.json(
        { message: requestedPostcode && results.length > 0
          ? `The result did not match postcode ${requestedPostcode}. Add the suburb to confirm the correct street.`
          : 'We could not find that address. Add the suburb, state, and postcode.' },
        { status: 404 },
      );
    }

    const location = { lat, lng, displayName: first.display_name };
    cache.set(cacheKey, location);
    return Response.json(location, { headers: { 'Cache-Control': 'public, max-age=86400' } });
  } catch {
    return Response.json(
      { message: 'The address service is temporarily unavailable. Please try again.' },
      { status: 503 },
    );
  }
}
