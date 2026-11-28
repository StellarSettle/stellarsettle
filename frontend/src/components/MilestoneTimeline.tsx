import { AlertTriangle, Check, LoaderCircle } from "lucide-react";

export type TimelineMilestone = {
  name: string;
  status: string;
};

type Props = { milestones: TimelineMilestone[] };

export function MilestoneTimeline({ milestones }: Props) {
  const activeIndex = milestones.findIndex((m) => m.status === "InProgress" || m.status === "ProofSubmitted");
  return (
    <ol className="milestone-timeline" data-testid="milestone-timeline">
      {milestones.map((milestone, index) => {
        const completed = milestone.status === "Completed" || milestone.status === "Confirmed";
        const disputed = milestone.status === "Disputed";
        const inProgress = index === activeIndex;
        return (
          <li key={`${milestone.name}-${index}`} className={inProgress ? "milestone-timeline__item--active" : undefined}>
            <span className="milestone-timeline__icon" aria-hidden="true">
              {completed && <Check data-testid="icon-completed" size={16} />}
              {disputed && <AlertTriangle data-testid="icon-disputed" size={16} />}
              {!completed && !disputed && inProgress && <LoaderCircle data-testid="icon-in-progress" size={16} />}
            </span>
            <span>{milestone.name}</span>
          </li>
        );
      })}
    </ol>
  );
}