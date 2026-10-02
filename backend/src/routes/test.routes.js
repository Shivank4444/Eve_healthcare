import express from "express";
import {
    createTest,
    getAllTests,
    getTestById,
    updateTest,
    deleteTest,
} from "../controllers/test.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const testRoutes = express.Router();

testRoutes.get("/", getAllTests);
testRoutes.get("/:id", getTestById);

testRoutes.post("/", authMiddleware, createTest);
testRoutes.patch("/:id", authMiddleware, updateTest);
testRoutes.delete("/:id", authMiddleware, deleteTest);

export default testRoutes;
