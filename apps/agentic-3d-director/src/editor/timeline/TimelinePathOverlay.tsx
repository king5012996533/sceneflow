import { Line } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useEffect } from "react";
import { normalizeDirectorTimeline, sampleTimelineTrack } from "./animationTimeline";
import { useDirectorStore } from "../store/directorStore";

const PATH_ELEVATION = 0.025;

function PathMarker({
  color,
  position,
  selected,
}: {
  color: string;
  position: [number, number, number];
  selected: boolean;
}) {
  return (
    <mesh position={[position[0], position[1] + PATH_ELEVATION, position[2]]}>
      <sphereGeometry args={[selected ? 0.075 : 0.052, 16, 12]} />
      <meshBasicMaterial color={color} depthTest={false} transparent opacity={selected ? 1 : 0.72} />
    </mesh>
  );
}

export function TimelinePathOverlay({ groundHeight }: { groundHeight: number }) {
  const timeline = useDirectorStore((state) => state.project.timeline);
  const timelinePanelOpen = useDirectorStore((state) => state.timelinePanelOpen);
  const selectedTimelineTrackId = useDirectorStore((state) => state.selectedTimelineTrackId);
  const selectedTimelineKeyframeId = useDirectorStore((state) => state.selectedTimelineKeyframeId);
  const selectTimelineTrack = useDirectorStore((state) => state.selectTimelineTrack);
  const trajectoryDrawingObjectId = useDirectorStore((state) => state.trajectoryDrawingObjectId);
  const trajectoryDraftPoints = useDirectorStore((state) => state.trajectoryDraftPoints);
  const addTrajectoryDraftPoint = useDirectorStore((state) => state.addTrajectoryDraftPoint);
  const finishTrajectoryDrawing = useDirectorStore((state) => state.finishTrajectoryDrawing);
  const cancelTrajectoryDrawing = useDirectorStore((state) => state.cancelTrajectoryDrawing);
  const normalizedTimeline = normalizeDirectorTimeline(timeline);

  useEffect(() => {
    if (!trajectoryDrawingObjectId) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") cancelTrajectoryDrawing();
      if (event.key === "Enter") finishTrajectoryDrawing();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cancelTrajectoryDrawing, finishTrajectoryDrawing, trajectoryDrawingObjectId]);

  function addPoint(event: ThreeEvent<PointerEvent>) {
    if (!trajectoryDrawingObjectId) return;
    event.stopPropagation();
    addTrajectoryDraftPoint([event.point.x, event.point.y, event.point.z]);
  }

  function finishDrawing(event: ThreeEvent<MouseEvent>) {
    if (!trajectoryDrawingObjectId) return;
    event.stopPropagation();
    finishTrajectoryDrawing();
  }

  if (!timelinePanelOpen && !trajectoryDrawingObjectId) return null;

  return (
    <group name="timeline-path-overlay">
      {normalizedTimeline.tracks.map((track) => {
        if (!track.enabled || track.keyframes.length === 0) return null;
        const selected = track.id === selectedTimelineTrackId;
        const points = sampleTimelineTrack(track, track.preset === "circle" ? 10 : 16).map(
          (point): [number, number, number] => [point[0], point[1] + PATH_ELEVATION, point[2]]
        );

        return (
          <group key={track.id} name={`timeline-path-${track.id}`}>
            {points.length >= 2 ? (
              <Line
                color={track.color}
                depthTest={false}
                lineWidth={selected ? 3 : 1.5}
                onClick={(event) => {
                  event.stopPropagation();
                  selectTimelineTrack(track.id);
                }}
                opacity={selected ? 0.96 : 0.42}
                points={points}
                transparent
              />
            ) : null}
            {selected
              ? track.keyframes.map((frame) => (
                  <PathMarker
                    key={frame.id}
                    color={track.color}
                    position={frame.transform.position}
                    selected={frame.id === selectedTimelineKeyframeId}
                  />
                ))
              : null}
          </group>
        );
      })}

      {trajectoryDrawingObjectId ? (
        <>
          {trajectoryDraftPoints.length >= 2 ? (
            <Line
              color="#21d4f5"
              depthTest={false}
              lineWidth={3}
              opacity={0.95}
              points={trajectoryDraftPoints.map((point) => [point[0], point[1] + PATH_ELEVATION, point[2]])}
              transparent
            />
          ) : null}
          {trajectoryDraftPoints.map((point, index) => (
            <PathMarker key={`draft-${index}`} color="#21d4f5" position={point} selected />
          ))}
          <mesh
            name="trajectory-drawing-plane"
            onDoubleClick={finishDrawing}
            onPointerDown={addPoint}
            position={[0, groundHeight + PATH_ELEVATION, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[400, 400]} />
            <meshBasicMaterial color="#000000" depthWrite={false} opacity={0} transparent />
          </mesh>
        </>
      ) : null}
    </group>
  );
}
