import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Project, ProjectCopy } from '../../project.model';
import { UntypedFormGroup } from '@angular/forms';
import { FormlyFieldConfig, FormlyFormOptions } from '@ngx-formly/core';
import { ProjectService } from '../../project.service';
import { DEFAULT_PROJECT } from '../../project.const';
import { JiraCfg } from '../../../issue/providers/jira/jira.model';
import { CREATE_PROJECT_BASIC_CONFIG_FORM_CONFIG } from '../../project-form-cfg.const';
import { SS } from '../../../../core/persistence/storage-keys.const';
import { Subscription } from 'rxjs';
import {
  loadFromSessionStorage,
  saveToSessionStorage,
} from '../../../../core/persistence/local-storage';
import { GithubCfg } from '../../../issue/providers/github/github.model';
import { GiteaCfg } from '../../../issue/providers/gitea/gitea.model';
import { RedmineCfg } from '../../../issue/providers/redmine/redmine.model';
import { T } from '../../../../t.const';
import { WORK_CONTEXT_THEME_CONFIG_FORM_CONFIG } from '../../../work-context/work-context.const';
import { GitlabCfg } from 'src/app/features/issue/providers/gitlab/gitlab.model';
import { CaldavCfg } from 'src/app/features/issue/providers/caldav/caldav.model';
import { OpenProjectCfg } from '../../../issue/providers/open-project/open-project.model';
import { getRandomWorkContextColor } from '../../../work-context/work-context-color';
import { removeDebounceFromFormItems } from '../../../../util/remove-debounce-from-form-items';

@Component({
  selector: 'dialog-create-project',
  templateUrl: './dialog-create-project.component.html',
  styleUrls: ['./dialog-create-project.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class DialogCreateProjectComponent implements OnInit, OnDestroy {
  T: typeof T = T;
  projectData: ProjectCopy | Partial<ProjectCopy> = {
    ...DEFAULT_PROJECT,
    theme: { ...DEFAULT_PROJECT.theme, primary: getRandomWorkContextColor() },
  };
  jiraCfg?: JiraCfg;
  githubCfg?: GithubCfg;
  gitlabCfg?: GitlabCfg;
  caldavCfg?: CaldavCfg;
  openProjectCfg?: OpenProjectCfg;
  giteaCfg?: GiteaCfg;
  redmineCfg?: RedmineCfg;

  formBasic: UntypedFormGroup = new UntypedFormGroup({});
  formTheme: UntypedFormGroup = new UntypedFormGroup({});
  formOptionsBasic: FormlyFormOptions = {
    formState: {
      awesomeIsForced: false,
    },
  };
  formOptionsTheme: FormlyFormOptions = {
    formState: {
      awesomeIsForced: false,
    },
  };

  basicSettingsFormCfg: FormlyFieldConfig[] = [];
  themeFormCfg: FormlyFieldConfig[] = [];

  private _subs: Subscription = new Subscription();
  private _isSaveTmpProject: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) private _project: Project,
    private _projectService: ProjectService,
    private _matDialogRef: MatDialogRef<DialogCreateProjectComponent>,
  ) {
    // somehow they are only unproblematic if assigned here,
    this.basicSettingsFormCfg = removeDebounceFromFormItems(
      CREATE_PROJECT_BASIC_CONFIG_FORM_CONFIG.items as FormlyFieldConfig[],
    );
    this.themeFormCfg = removeDebounceFromFormItems(
      WORK_CONTEXT_THEME_CONFIG_FORM_CONFIG.items as FormlyFieldConfig[],
    );
  }

  ngOnInit(): void {
    if (this._project) {
      this.projectData = { ...this._project };
    } else {
      const ssVal: any = loadFromSessionStorage(SS.PROJECT_TMP);
      if (ssVal) {
        this.projectData = {
          ...DEFAULT_PROJECT,
          ...ssVal,
        };
      }
      this._isSaveTmpProject = true;

      // save tmp data if adding a new project
      // NOTE won't be properly executed if added to _subs
      this._matDialogRef.afterClosed().subscribe(() => {
        const projectDataToSave: Project | Partial<Project> = {
          ...this.projectData,
        };
        if (this._isSaveTmpProject) {
          saveToSessionStorage(SS.PROJECT_TMP, projectDataToSave);
        }
      });
    }
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  submit(): void {
    const projectDataToSave: Project | Partial<Project> = {
      ...this.projectData,
    };

    if (projectDataToSave.id) {
      this._projectService.update(projectDataToSave.id, projectDataToSave);
    } else {
      this._projectService.add(projectDataToSave);
    }
    this._isSaveTmpProject = false;
    sessionStorage.removeItem(SS.PROJECT_TMP);

    this._matDialogRef.close();
  }

  cancelEdit(): void {
    this._matDialogRef.close();
  }
}
