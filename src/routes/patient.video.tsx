import { createFileRoute } from "@tanstack/react-router";
import { VideoPage } from "@/components/patient/pages/VideoPage";

export const Route = createFileRoute("/patient/video")({
  head: () => ({ meta: [{ title: "Video Visits | Patient Portal | Gura Hospital" }] }),
  component: VideoPage,
});
