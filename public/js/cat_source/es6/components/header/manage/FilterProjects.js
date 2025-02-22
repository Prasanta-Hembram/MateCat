import React from 'react'
import _ from 'lodash'
import IconDown from '../../icons/IconDown'
import FilterProjectsStatus from './FilterProjectsStatus'
import SearchInput from './SearchInput'
import ManageActions from '../../../actions/ManageActions'
import ManageConstants from '../../../constants/ManageConstants'
import CommonUtils from '../../../utils/commonUtils'

class FilterProjects extends React.Component {
  constructor(props) {
    super(props)
    this.ALL_MEMBERS = '-1'
    this.NOT_ASSIGNED = '0'

    this.teamChanged = false
    this.dropDownUsersInitialized = false
    this.state = {
      currentStatus: 'active',
    }
    this.selectedUser = ManageConstants.ALL_MEMBERS_FILTER
  }

  componentDidUpdate() {
    let self = this
    if (this.props.selectedTeam) {
      2297
      if (this.teamChanged) {
        if (
          !this.dropDownUsersInitialized &&
          this.props.selectedTeam.get('members').size > 1
        ) {
          if (this.selectedUser === ManageConstants.ALL_MEMBERS_FILTER) {
            $(this.dropdownUsers).dropdown('set selected', '-1')
          } else {
            $(this.dropdownUsers).dropdown('set selected', this.selectedUser)
          }
          $(this.dropdownUsers).dropdown({
            fullTextSearch: 'exact',
            onChange: function (value) {
              self.changeUser(value)
            },
          })
          this.dropDownUsersInitialized = true
        }
        this.teamChanged = false
      }
    }
  }

  getSnapshotBeforeUpdate(propsBefore) {
    if (_.isUndefined(this.props.selectedTeam)) return null
    if (
      _.isUndefined(propsBefore.selectedTeam) ||
      this.props.selectedTeam.get('id') !==
        propsBefore.selectedTeam.get('id') ||
      this.props.selectedTeam.get('members') !==
        propsBefore.selectedTeam.get('members')
    ) {
      this.teamChanged = true
      this.dropDownUsersInitialized = false
      if (
        !_.isUndefined(propsBefore.selectedTeam) &&
        this.props.selectedTeam.get('id') !== propsBefore.selectedTeam.get('id')
      ) {
        this.selectedUser = ManageConstants.ALL_MEMBERS_FILTER
      }
      if (
        this.props.selectedTeam &&
        this.props.selectedTeam.get('type') !== 'personal' &&
        this.props.selectedTeam.get('members').size === 1
      ) {
        this.dropDownUsersInitialized = true
      }
    }
    return null
  }

  changeUser(value) {
    let self = this
    let selectedUser
    if (value === this.ALL_MEMBERS) {
      selectedUser = ManageConstants.ALL_MEMBERS_FILTER
    } else if (value === this.NOT_ASSIGNED && value !== this.selectedUser) {
      selectedUser = ManageConstants.NOT_ASSIGNED_FILTER
    } else {
      selectedUser = this.props.selectedTeam
        .get('members')
        .find(function (member) {
          if (parseInt(member.get('user').get('uid')) === parseInt(value)) {
            return true
          }
        })
    }
    if (selectedUser !== this.selectedUser) {
      this.selectedUser = selectedUser
      ManageActions.filterProjects(
        self.selectedUser,
        self.currentText,
        self.state.currentStatus,
      )
    }
  }

  onChangeSearchInput(value) {
    this.currentText = value
    let self = this
    ManageActions.filterProjects(
      self.selectedUser,
      self.currentText,
      self.state.currentStatus,
    )
  }

  filterByStatus(status) {
    this.setState({currentStatus: status})
    ManageActions.filterProjects(this.selectedUser, this.currentText, status)
  }

  getUserFilter() {
    let result = ''
    if (
      this.props.selectedTeam &&
      this.props.selectedTeam.get('type') === 'general' &&
      this.props.selectedTeam.get('members') &&
      this.props.selectedTeam.get('members').size > 1
    ) {
      let members = this.props.selectedTeam.get('members').map((member) => {
        let classDisable = member.get('projects') === 0 ? 'disabled' : ''
        let userIcon = (
          <a className="ui circular label">
            {CommonUtils.getUserShortName(member.get('user').toJS())}
          </a>
        )
        if (member.get('user_metadata')) {
          userIcon = (
            <img
              className="ui avatar image ui-user-dropdown-image"
              src={member.get('user_metadata').get('gplus_picture') + '?sz=80'}
            />
          )
        }
        return (
          <div
            className={'item ' + classDisable}
            data-value={member.get('user').get('uid')}
            key={'user' + member.get('user').get('uid')}
          >
            {userIcon}
            <div className="user-projects">
              <div className="user-name-filter">
                {member.get('user').get('first_name') +
                  ' ' +
                  member.get('user').get('last_name')}
              </div>
              <div className="box-number-project">{member.get('projects')}</div>
            </div>
          </div>
        )
      })

      let item = (
        <div className="item" data-value="-1" key={'user' + -1}>
          <a className="ui all label">ALL</a>
          <div className="user-projects">
            <div className="user-name-filter">All Members</div>
            <div className="box-number-project"></div>
          </div>
        </div>
      )
      members = members.unshift(item)
      item = (
        <div className="item" data-value="0" key={'user' + 0}>
          <a className="ui all label">NA</a>
          <div className="user-projects">
            <div className="user-name-filter">Not assigned</div>
            <div className="box-number-project"></div>
          </div>
        </div>
      )
      members = members.unshift(item)

      result = (
        <div
          className="ui top left pointing dropdown users-filter"
          title="Filter project by members"
          ref={(dropdown) => (this.dropdownUsers = dropdown)}
        >
          <div className="text">
            <div className="ui all label">ALL</div>
            All Members
          </div>
          <div className="icon">
            <IconDown width={16} height={16} color={'#788190'} />
          </div>
          <div className="menu">{members}</div>
        </div>
      )
    }
    return result
  }

  shouldComponentUpdate(nextProps) {
    return (
      _.isUndefined(this.props.selectedTeam) ||
      (!_.isUndefined(nextProps.selectedTeam) &&
        !nextProps.selectedTeam.equals(this.props.selectedTeam))
    )
  }

  render() {
    let membersFilter = this.getUserFilter()

    return (
      <section className="row sub-head">
        <div className="ui grid">
          <div className="twelve wide column">
            <div className="ui right labeled fluid input search-state-filters">
              <SearchInput onChange={this.onChangeSearchInput.bind(this)} />
              <FilterProjectsStatus
                filterFunction={this.filterByStatus.bind(this)}
              />
            </div>
          </div>

          {/*<div className="cta-create-team" onClick={this.openCreateTeams.bind(this)}>
                        <a class="cta-create-team-text">Create New Team <i className="icon-settings icon"></i></a>
                    </div>*/}

          <div className="four wide column pad-right-0">{membersFilter}</div>
        </div>
      </section>
    )
  }
}

export default FilterProjects
