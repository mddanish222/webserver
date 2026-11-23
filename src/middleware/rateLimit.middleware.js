/**
 * In-Memory Sliding-Window Rate Limiting Middleware
 * Protects authentication & API endpoints against brute-force & DDoS attacks.
 */

function createRateLimiter(options = {}) {
    const windowMs = options.windowMs || 15 * 60 * 1000; // Default 15 minutes
    const max = options.max || 100;
    const message = options.message || "Too many requests, please try again later.";
    const keyGenerator = options.keyGenerator || ((req) => req.ip || req.connection.remoteAddress || "global");

    const hits = new Map();

    // Periodic sweep to clean up expired windows (prevents memory leak)
    setInterval(() => {
        const now = Date.now();
        for (const [key, record] of hits.entries()) {
            if (now > record.resetTime) {
                hits.delete(key);
            }
        }
    }, Math.min(windowMs, 60000)).unref();

    return function rateLimit(req, res, next) {
        const key = keyGenerator(req);
        const now = Date.now();

        let record = hits.get(key);
        if (!record || now > record.resetTime) {
            record = { count: 1, resetTime: now + windowMs };
            hits.set(key, record);
        } else {
            record.count++;
        }

        const remaining = Math.max(0, max - record.count);
        const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', remaining);
        res.setHeader('X-RateLimit-Reset', resetSeconds);

        if (record.count > max) {
            res.setHeader('Retry-After', resetSeconds);
            console.warn(`⚠️ Rate Limit Exceeded for [${key}]. Attempts: ${record.count}/${max}`);
            return res.status(429).json({
                success: false,
                message: message,
                retryAfterSeconds: resetSeconds
            });
        }

        next();
    };
}

// Strict limiter for authentication (Login, Register, PIN Reset)
const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 mins
    max: 10,                   // 10 attempts
    message: "Too many login/PIN attempts from this device. Please try again after 15 minutes.",
    keyGenerator: (req) => {
        const ip = req.ip || req.connection?.remoteAddress || 'unknown';
        const target = (req.body && (req.body.emailOrPhone || req.body.staffPhoneOrEmail)) || '';
        return `auth_${ip}_${target.trim().toLowerCase()}`;
    }
});

// General API protection limiter
const apiLimiter = createRateLimiter({
    windowMs: 60 * 1000,      // 1 minute
    max: 200,                  // 200 requests/min
    message: "API request rate limit exceeded. Please slow down."
});

module.exports = {
    createRateLimiter,
    authLimiter,
    apiLimiter
};
