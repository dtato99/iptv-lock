import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const MAX_DEVICES = 3;

const REAL_M3U =
  "https://drive.google.com/uc?export=download&id=10su1Z--rOXBXguPb6d-bcggsUrFib8fH";

export default async function handler(req, res) {

  try {

    const ip =
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      "unknown";

    const key = "active_devices";

    // guardar IP
    await redis.hset(
      key,
      ip,
      Date.now()
    );

    const devices =
      await redis.hgetall(key);

    const now = Date.now();

    // limpiar viejos
    for (const deviceIp in devices) {

      const last =
        Number(devices[deviceIp]);

      if (
        now - last >
        1000 * 60 * 5
      ) {

        await redis.hdel(
          key,
          deviceIp
        );
      }
    }

    const updated =
      await redis.hgetall(key);

    const total =
      Object.keys(updated).length;

    if (total > MAX_DEVICES) {

      return res
        .status(403)
        .send(
          "Maximum devices reached"
        );
    }

    const response =
      await fetch(REAL_M3U);

    const text =
      await response.text();

    res.setHeader(
      "Content-Type",
      "audio/x-mpegurl"
    );

    return res
      .status(200)
      .send(text);

  } catch (err) {

    return res
      .status(500)
      .send("Server Error");
  }
}
