import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { createInitialDirectorState, useDirectorStore } from "./editor/store/directorStore";

vi.mock("./editor/canvas/DirectorCanvas", () => ({
  DirectorCanvas: () => <div data-testid="mock-director-canvas" />,
}));

import App from "./App";

beforeEach(() => {
  useDirectorStore.setState({
    ...useDirectorStore.getState(),
    ...createInitialDirectorState(),
  });
});

it("renders the director desk header and view mode switch", () => {
  const { container } = render(<App />);

  expect(screen.getByText("Agentic 3D Director")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "导演视角" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "机位视角" })).toBeInTheDocument();
  expect(container.querySelector(".top-bar-center .mode-toggle")).toBeInTheDocument();
  expect(screen.queryByLabelText("帮助")).not.toBeInTheDocument();
  expect(screen.getByLabelText("关闭")).toBeInTheDocument();
});

it("notifies the host canvas when the director desk app is ready", () => {
  const postMessage = vi.spyOn(window.parent, "postMessage").mockImplementation(() => undefined);

  render(<App />);

  expect(postMessage).toHaveBeenCalledWith(
    { type: "storyai:director-desk-ready" },
    window.location.origin
  );

  postMessage.mockRestore();
});

it("notifies the host canvas when the director desk close button is clicked", async () => {
  const user = userEvent.setup();
  const postMessage = vi.spyOn(window.parent, "postMessage").mockImplementation(() => undefined);

  render(<App />);

  await user.click(screen.getByRole("button", { name: "关闭" }));

  expect(postMessage).toHaveBeenCalledWith(
    { type: "storyai:director-desk-close" },
    window.location.origin
  );

  postMessage.mockRestore();
});

it("uses a full-width director desk frame instead of floating card columns", () => {
  const { container } = render(<App />);
  const shell = container.querySelector(".director-shell.director-shell-fullbleed");

  expect(shell).toBeInTheDocument();
  expect(shell?.firstElementChild).toHaveClass("viewport-column");
  expect(screen.getByLabelText("场景")).toHaveClass("left-sidebar");
  expect(screen.getByLabelText("3D视口")).toHaveClass("viewport-column");
  expect(screen.getByLabelText("属性")).toHaveClass("right-sidebar");
});

it("collapses both side panels from the fullscreen toolbar action", async () => {
  const { container, rerender } = render(<App />);

  expect(container.querySelector(".director-shell-fullbleed.is-sidebars-collapsed")).not.toBeInTheDocument();

  act(() => {
    useDirectorStore.setState({
      ...useDirectorStore.getState(),
      viewportPanelsCollapsed: true,
    } as ReturnType<typeof useDirectorStore.getState>);
  });
  rerender(<App />);

  expect(container.querySelector(".director-shell-fullbleed.is-sidebars-collapsed")).toBeInTheDocument();
  expect(screen.getByLabelText("场景")).toHaveAttribute("aria-hidden", "true");
  expect(screen.getByLabelText("属性")).toHaveAttribute("aria-hidden", "true");
});

it("switches from director mode to camera mode", async () => {
  const user = userEvent.setup();
  render(<App />);

  const directorButton = screen.getByRole("button", { name: "导演视角" });
  const cameraButton = screen.getByRole("button", { name: "机位视角" });

  expect(directorButton).toHaveAttribute("aria-pressed", "true");
  expect(cameraButton).toHaveAttribute("aria-pressed", "false");

  await user.click(cameraButton);

  expect(directorButton).toHaveAttribute("aria-pressed", "false");
  expect(cameraButton).toHaveAttribute("aria-pressed", "true");
});

it("opens and closes the in-page director agent", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole("button", { name: "导演助手" }));
  expect(screen.getByRole("complementary", { name: "导演助手" })).toBeInTheDocument();
  expect(screen.getByText("告诉我人物怎么站、镜头怎么看")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "关闭导演助手" }));
  expect(screen.queryByRole("complementary", { name: "导演助手" })).not.toBeInTheDocument();
});

it("moves the director agent panel by dragging its header and keeps the position when reopened", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole("button", { name: "导演助手" }));
  const drawer = screen.getByRole("complementary", { name: "导演助手" });
  const dragHandle = screen.getByLabelText("拖动导演助手面板");

  fireEvent.mouseDown(dragHandle, { button: 0, clientX: 100, clientY: 100 });
  expect(drawer).toHaveClass("is-dragging");
  fireEvent.mouseMove(window, { clientX: 180, clientY: 140 });
  fireEvent.mouseUp(window);

  expect(drawer).toHaveStyle({ transform: "translate3d(80px, 40px, 0)" });
  expect(drawer).not.toHaveClass("is-dragging");

  await user.click(screen.getByRole("button", { name: "关闭导演助手" }));
  await user.click(screen.getByRole("button", { name: "导演助手" }));
  expect(screen.getByRole("complementary", { name: "导演助手" })).toHaveStyle({
    transform: "translate3d(80px, 40px, 0)",
  });
});

it("supports Cmd/Ctrl+C and Cmd/Ctrl+V to duplicate the selected object", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole("button", { name: "角色01" }));
  await user.keyboard("{Control>}c{/Control}");
  await user.keyboard("{Control>}v{/Control}");

  const state = useDirectorStore.getState();
  const characters = state.project.objects.filter((item) => item.kind === "character");

  expect(characters).toHaveLength(2);
  expect(characters[1]?.id).not.toBe("char_default_a");
  expect(state.selectedObjectId).toBe(characters[1]?.id ?? null);
});

it("supports Cmd/Ctrl+Z to undo the latest scene edit", async () => {
  const user = userEvent.setup();
  render(<App />);

  act(() => {
    useDirectorStore.getState().addPresetCharacter("female");
  });
  expect(useDirectorStore.getState().project.objects.some((item) => item.name === "角色02")).toBe(true);

  await user.keyboard("{Control>}z{/Control}");

  expect(useDirectorStore.getState().project.objects.some((item) => item.name === "角色02")).toBe(false);
});
