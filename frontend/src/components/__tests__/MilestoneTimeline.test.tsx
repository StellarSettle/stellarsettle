import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MilestoneTimeline } from "../MilestoneTimeline";

describe("MilestoneTimeline", () => {
  const milestones = [
    { name: "Pickup", status: "Completed" },
    { name: "Transit", status: "InProgress" },
    { name: "Delivery", status: "Disputed" },
  ];

  it("shows check icon for completed milestones", () => {
    render(<MilestoneTimeline milestones={milestones} />);
    expect(screen.getByTestId("icon-completed")).toBeTruthy();
  });

  it("shows warning icon for disputed milestones", () => {
    render(<MilestoneTimeline milestones={milestones} />);
    expect(screen.getByTestId("icon-disputed")).toBeTruthy();
  });

  it("highlights the in-progress milestone", () => {
    render(<MilestoneTimeline milestones={milestones} />);
    expect(screen.getByTestId("icon-in-progress")).toBeTruthy();
    expect(document.querySelector(".milestone-timeline__item--active")).toBeTruthy();
  });
});