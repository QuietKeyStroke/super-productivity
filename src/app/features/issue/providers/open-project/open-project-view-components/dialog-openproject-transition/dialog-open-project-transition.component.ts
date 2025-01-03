import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';
import { concatMap, first, map, switchMap } from 'rxjs/operators';
import { SnackService } from 'src/app/core/snack/snack.service';
import {
  IssueLocalState,
  IssueProviderOpenProject,
} from 'src/app/features/issue/issue.model';
import { IssueService } from 'src/app/features/issue/issue.service';
import { T } from 'src/app/t.const';
import { Task } from '../../../../../tasks/task.model';
import { OpenProjectOriginalStatus } from '../../open-project-api-responses';
import { OpenProjectApiService } from '../../open-project-api.service';
import { OpenProjectWorkPackage } from '../../open-project-issue/open-project-issue.model';
import { IssueProviderService } from 'src/app/features/issue/issue-provider.service';
import { assertTruthy } from '../../../../../../util/assert-truthy';
import { UiModule } from '../../../../../../ui/ui.module';
import { FormsModule } from '@angular/forms';
import { AsyncPipe, NgForOf } from '@angular/common';
import { MatSlider } from '@angular/material/slider';
import { TaskService } from '../../../../../tasks/task.service';

@Component({
  selector: 'dialog-open-project-transition',
  templateUrl: './dialog-open-project-transition.component.html',
  styleUrls: ['./dialog-open-project-transition.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiModule, FormsModule, NgForOf, AsyncPipe, MatSlider],
})
export class DialogOpenProjectTransitionComponent {
  T: typeof T = T;

  _issueProviderIdOnce$: Observable<string> = this.data.task.issueProviderId
    ? of(this.data.task.issueProviderId)
    : this._taskService.getByIdOnce$(this.data.task.parentId as string).pipe(
        map((parentTask) => {
          if (!parentTask.issueProviderId) {
            throw new Error('No issue provider id found');
          }
          return parentTask.issueProviderId;
        }),
      );

  _openProjectCfg$: Observable<IssueProviderOpenProject> =
    this._issueProviderIdOnce$.pipe(
      switchMap(() =>
        this._issueProviderService.getCfgOnce$(
          assertTruthy(this.data.task.issueProviderId),
          'OPEN_PROJECT',
        ),
      ),
    );

  availableTransitions$: Observable<OpenProjectOriginalStatus[]> =
    this._openProjectCfg$.pipe(
      switchMap((cfg) =>
        this._openProjectApiService.getTransitionsForIssue$(
          this.data.issue.id,
          this.data.issue.lockVersion,
          cfg,
        ),
      ),
    );

  chosenTransition?: OpenProjectOriginalStatus;
  percentageDone: number;

  constructor(
    private _openProjectApiService: OpenProjectApiService,
    private _issueService: IssueService,
    private _issueProviderService: IssueProviderService,
    private _matDialogRef: MatDialogRef<DialogOpenProjectTransitionComponent>,
    private _snackService: SnackService,
    private _taskService: TaskService,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      issue: OpenProjectWorkPackage;
      localState: IssueLocalState;
      task: Task;
    },
  ) {
    this.percentageDone = data.issue.percentageDone;
  }

  transitionIssue(): void {
    if (this.chosenTransition && this.chosenTransition.id) {
      const trans: OpenProjectOriginalStatus = this.chosenTransition;

      this._openProjectCfg$
        .pipe(
          concatMap((openProjectCfg) =>
            this._openProjectApiService.transitionIssue$(
              { ...this.data.issue, percentageDone: this.percentageDone },
              trans,
              openProjectCfg,
            ),
          ),
          first(),
        )
        .subscribe(() => {
          this._issueService.refreshIssueTask(this.data.task, false, false);
          this._snackService.open({
            type: 'SUCCESS',
            msg: T.F.OPEN_PROJECT.S.TRANSITION,
            translateParams: { issueKey: this.data.issue.subject, name: trans.name },
          });
          this.close();
        });
    }
  }

  close(): void {
    this._matDialogRef.close();
  }

  trackByIndex(i: number, p: any): number {
    return i;
  }

  displayThumbWith(value: number): string {
    return `${value}%`;
  }
}
