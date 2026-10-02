export const notFound = (req, res) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.method} ${req.originalUrl} not found`,
    });
};

export const errorHandler = (error, req, res, next) => {
    console.error("Unhandled error:", error);

    if (res.headersSent) {
        return next(error);
    }

    res.status(500).json({
        success: false,
        error: "Internal server error",
    });
};
