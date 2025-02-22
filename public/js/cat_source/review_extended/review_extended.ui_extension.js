import _ from 'lodash'

import CommonUtils from '../es6/utils/commonUtils'
import SegmentActions from '../es6/actions/SegmentActions'
import SegmentStore from '../es6/stores/SegmentStore'
import {getSegmentVersionsIssues} from '../es6/api/getSegmentVersionsIssues'
import {sendSegmentVersionIssue} from '../es6/api/sendSegmentVersionIssue'
import {sendSegmentVersionIssueComment} from '../es6/api/sendSegmentVersionIssueComment'
import {deleteSegmentIssue as deleteSegmentIssueApi} from '../es6/api/deleteSegmentIssue'
import CatToolActions from '../es6/actions/CatToolActions'

if (ReviewExtended.enabled()) {
  $.extend(ReviewExtended, {
    submitIssue: function (sid, data) {
      var fid = UI.getSegmentFileId(UI.getSegmentById(sid))

      const promise = sendSegmentVersionIssue(sid, {
        ...data,
      })
      promise.then(() => {
        UI.getSegmentVersionsIssues(sid, fid)
        CatToolActions.reloadQualityReport()
      })

      return promise
    },

    submitComment: function (id_segment, id_issue, data) {
      const promise = sendSegmentVersionIssueComment(id_segment, id_issue, data)
      promise.then(() => {
        var fid = UI.getSegmentFileId(UI.getSegmentById(id_segment))
        UI.getSegmentVersionsIssues(id_segment, fid)
      })
      return promise
    },
  })

  $.extend(UI, {
    submitIssues: function (sid, data) {
      return ReviewExtended.submitIssue(sid, data)
    },

    getSegmentVersionsIssuesHandler(sid) {
      var segment = SegmentStore.getSegmentByIdToJS(sid)
      UI.getSegmentVersionsIssues(segment.original_sid, segment.id_file)
    },

    getSegmentVersionsIssues: function (segmentId, fileId) {
      getSegmentVersionsIssues(segmentId).then((response) => {
        UI.addIssuesToSegment(fileId, segmentId, response.versions)
      })
    },

    /**
     * To show the issues in the segment footer
     * @param fileId
     * @param segmentId
     * @param versions
     */
    addIssuesToSegment: function (fileId, segmentId, versions) {
      SegmentActions.addTranslationIssuesToSegment(fileId, segmentId, versions)
    },

    /**
     * To delete a segment issue
     * @param context
     */
    deleteTranslationIssue: function (idSegment, idIssue) {
      var fid = UI.getSegmentFileId(UI.getSegmentById(idSegment))

      deleteSegmentIssueApi({
        idSegment,
        idIssue,
      }).then(() => {
        UI.deleteSegmentIssues(fid, idSegment, idIssue)
        CatToolActions.reloadQualityReport()
      })
    },
    /**
     * To remove Segment issue from the segment footer
     * @param fid
     * @param id_segment
     * @param issue_id
     */
    deleteSegmentIssues: function (fid, id_segment, issue_id) {
      SegmentActions.confirmDeletedIssue(id_segment, issue_id)
      UI.getSegmentVersionsIssues(id_segment, fid)
    },
    /**
     * To know if a segment has been modified but not yet approved
     * @param sid
     * @returns {boolean}
     */
    segmentIsModified: function (sid) {
      var segment = SegmentStore.getSegmentByIdToJS(sid)
      return segment.modified
    },
    submitComment: function (id_segment, id_issue, data) {
      return ReviewExtended.submitComment(id_segment, id_issue, data)
    },
    openIssuesPanel: function (data, openSegment) {
      var segment = SegmentStore.getSegmentByIdToJS(data.sid)

      if (segment && !UI.evalOpenableSegment(segment)) {
        return false
      }
      $('body').addClass('review-extended-opened')
      localStorage.setItem(ReviewExtended.localStoragePanelClosed, false)

      $('body').addClass('side-tools-opened review-side-panel-opened')
      window.dispatchEvent(new Event('resize'))
      if (data && openSegment) {
        SegmentActions.openSegment(data.sid)
        SegmentActions.scrollToSegment(data.sid)
        window.setTimeout(
          function (data) {
            SegmentActions.scrollToSegment(data.sid)
          },
          500,
          data,
        )
      }
      return true
    },

    deleteIssue: function (issue, sid) {
      UI.deleteTranslationIssue(sid, issue.id)
    },

    getSegmentRevisionIssues(segment, revisionNumber) {
      let issues = []
      if (segment.versions && segment.versions.length > 0) {
        _.forEach(segment.versions, (version) => {
          if (version.issues && version.issues.length > 0) {
            _.forEach(version.issues, (issue) => {
              if (issue.revision_number === revisionNumber) {
                issues.push(issue)
              }
            })
          }
        })
      }
      return issues
    },

    clickOnApprovedButton: function (segment, goToNextUnapproved) {
      // the event click: 'A.APPROVED' i need to specify the tag a and not only the class
      // because of the event is triggered even on download button
      var sid = segment.sid

      let issues = this.getSegmentRevisionIssues(segment, config.revisionNumber)
      /* If segment is modified and there aren't issues and is not an ICE force to add an Issue.
         If is an ICE we allow to change the translation because is not possible to add an issue
       */

      if (
        config.isReview &&
        !segment.splitted &&
        segment.modified &&
        issues.length === 0 &&
        segment.ice_locked !== '1'
      ) {
        SegmentActions.openIssuesPanel({sid: segment.sid}, true)
        setTimeout(() => SegmentActions.showIssuesMessage(segment.sid, 1))
        return
      }

      SegmentActions.removeClassToSegment(sid, 'modified')

      var afterApproveFn = function () {
        if (goToNextUnapproved) {
          if (segment.revision_number > 1) {
            UI.openNextApproved()
          } else {
            UI.openNextTranslated()
          }
        } else {
          UI.gotoNextSegment(sid)
        }
      }

      UI.setTimeToEdit(sid)
      UI.changeStatus(segment, 'approved', afterApproveFn) // this does < setTranslation

      // Lock the segment if it's approved in a second pass but was previously approved in first revision
      if (ReviewExtended.number > 1) {
        CommonUtils.removeFromStorage('unlocked-' + sid)
      }
    },
    openNextApproved: function (sid) {
      sid = sid || UI.currentSegmentId
      var nextApprovedSegment = SegmentStore.getNextSegment(
        sid,
        null,
        9,
        1,
        true,
      )
      var nextApprovedSegmentInPrevious = SegmentStore.getNextSegment(
        -1,
        null,
        9,
        1,
        true,
      )
      // find in next segments
      if (nextApprovedSegment) {
        SegmentActions.openSegment(nextApprovedSegment.sid)
        // else find from the beginning of the currently loaded segments in all files
      } else if (this.noMoreSegmentsBefore && nextApprovedSegmentInPrevious) {
        SegmentActions.openSegment(nextApprovedSegmentInPrevious.sid)
      } else if (!this.noMoreSegmentsBefore || !this.noMoreSegmentsAfter) {
        // find in not loaded segments or go to the next approved
        SegmentActions.openSegment(UI.nextUntranslatedSegmentIdByServer)
      }
    },
  })
}
