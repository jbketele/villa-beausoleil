export default async () => {
    try {
        const icalUrl = process.env.AIRBNB_ICAL_URL;

        if (!icalUrl) {
            return new Response(
                JSON.stringify({
                    error: "AIRBNB_ICAL_URL n'est pas configurée."
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        const response = await fetch(icalUrl);

        if (!response.ok) {
            return new Response(
                JSON.stringify({
                    error: "Impossible de récupérer le calendrier Airbnb."
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        const ical = await response.text();

        const events = [];
        const lines = ical
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .split("\n");

        let event = null;

        for (const line of lines) {

            if (line === "BEGIN:VEVENT") {
                event = {};
                continue;
            }

            if (line === "END:VEVENT") {
                if (event?.start && event?.end) {
                    events.push({
                        start: event.start,
                        end: event.end
                    });
                }

                event = null;
                continue;
            }

            if (!event) continue;

            if (line.startsWith("DTSTART")) {
                event.start = extractDate(line);
            }

            if (line.startsWith("DTEND")) {
                event.end = extractDate(line);
            }
        }

        return new Response(
            JSON.stringify(events),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "public, max-age=300"
                }
            }
        );

    } catch (error) {

        console.error(error);

        return new Response(
            JSON.stringify({
                error: "Erreur lors de la récupération du calendrier."
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    }
};


function extractDate(line) {

    const value = line.split(":").pop();

    // Format Airbnb classique : 20261003
    if (/^\d{8}$/.test(value)) {
        return `${value.substring(0, 4)}-${value.substring(4, 6)}-${value.substring(6, 8)}`;
    }

    // Format avec heure : 20261003T120000Z
    if (/^\d{8}T/.test(value)) {
        return `${value.substring(0, 4)}-${value.substring(4, 6)}-${value.substring(6, 8)}`;
    }

    return null;
}