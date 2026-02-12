import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    base: "./",
    plugins: [react()],
    build: {
        target: "es2020",
    },
    server: {
        host: true, // listen on 0.0.0.0 so other devices on the network can access via your LAN IP (e.g. http://192.168.29.125:5173)
        watch: {
            ignored: ["**/swift-runtime/**", "**/*.swift"],
        },
    },
});