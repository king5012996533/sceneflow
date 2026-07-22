import { useDirectorStore } from "../store/directorStore";
import { selectRightPanelKind } from "../store/directorSelectors";
import { CameraPanel } from "./CameraPanel";
import { CharacterPanel } from "./CharacterPanel";
import { PropPanel } from "./PropPanel";
import { ScenePanel } from "./ScenePanel";
import { TrajectoryInspectorPanel } from "./TrajectoryInspectorPanel";

export function RightPanel() {
  const panelKind = useDirectorStore(selectRightPanelKind);
  const selectedTimelineTrackId = useDirectorStore((state) => state.selectedTimelineTrackId);
  const hasSelectedTimelineTrack = useDirectorStore((state) =>
    Boolean(state.project.timeline?.tracks.some((track) => track.id === state.selectedTimelineTrackId))
  );

  if (selectedTimelineTrackId && hasSelectedTimelineTrack) return <TrajectoryInspectorPanel />;

  if (panelKind === "character") return <CharacterPanel />;
  if (panelKind === "prop") return <PropPanel />;
  if (panelKind === "camera") return <CameraPanel />;
  return <ScenePanel />;
}
