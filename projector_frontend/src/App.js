import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import React, { Component } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  CardImg,
  CardTitle,
  CardBody,
  Badge,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  UncontrolledDropdown,
  InputGroup
} from 'reactstrap';
import { BrowserRouter as Router, Route, Link, Switch, Redirect } from 'react-router-dom';
import ProjectPage from './ProjectPage';
import ProjectForm from './components/project-form'
import Header from './components/Header';
import Footer from './components/Footer';
import * as Constants from './constants';
import LoginPage from './LoginPage';
import UserPage from './UserPage';
import UserForm from './components/user-form'

class App extends Component {
    constructor(props) {
      super(props);
      this.state = {
        projects: null,
        user: null,
        refreshTimerId: null
      }

      const userString = localStorage.getItem(Constants.LOCAL_STORAGE_USER_KEY);
      if (userString) {
        const user = JSON.parse(userString);
        this.state.user = user;
      }

      this.login = this.login.bind(this);
      this.logout = this.logout.bind(this);
      this.refreshUserToken = this.refreshUserToken.bind(this);
      this.handleSearch = this.handleSearch.bind(this);
      this.filterByCategory = this.filterByCategory.bind(this);
    }

    login(user) {
      if (this.state.refreshTimerId) {
        clearInterval(this.state.refreshTimerId);
      }

      this.setState({ user: user, refreshTimerId: setInterval(this.refreshUserToken, Constants.ACCESS_TOKEN_REFRESH_RATE, user.refresh_token) });
      localStorage.setItem(Constants.LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
    }

    logout() {
      if (this.state.refreshTimerId) {
        clearInterval(this.state.refreshTimerId);
      }

      localStorage.removeItem(Constants.LOCAL_STORAGE_USER_KEY);
      this.setState({ user: null, refreshTimerId: null });
    }

    refreshUserToken(refreshToken) {
      fetch(Constants.OAUTH_REFRESH_URL, {
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({ refresh: refreshToken })
      })
        .then(resp => {
          if (!resp.ok) {
            throw Error;
          }
          return resp.json();
        })
        .then(data => {
          this.setState(oldState => { oldState.user.access_token = data.access; })
        })
        .catch(_ => {
          // This should mean that the refresh token has expired (or the server has crashed), so we should forcibly log out
          // the user and reload the page to force them to log in again.
          this.logout();
          window.location.reload();
        });
    }

    componentDidMount() {
      fetch(Constants.PROJECT_LIST_URL)
        .then(response => response.json())
        .then(data => this.setState({ projects: data }))
        .catch(err => console.log(err));

      if (this.state.user) {
        this.refreshUserToken(this.state.user.refresh_token);
        this.setState({ refreshTimerId: setInterval(this.refreshUserToken, Constants.ACCESS_TOKEN_REFRESH_RATE, this.state.user.refresh_token) });
      }
    }

    componentWillUnmount() {
      if (this.state.refreshTimerId) {
        clearInterval(this.state.refreshTimerId);
        this.setState({ refreshTimerId: null });
      }
    }

    handleSearch(event) {
      let filteredList = [];
      let query = event.target.value;
      const { projects } = this.state;

      if (projects && query !== "") {
        // Search query is not empty, so filter projects by title
        query = query.toLowerCase().split(" ");

        // TODO: search + sort by relevancy?
        filteredList = projects.filter(project => {
          const projectName = project.name.toLowerCase();
          const projectBlurb = project.blurb.toLowerCase();
          const projectDescription = project.description.toLowerCase();
          return query.some(term => (projectName.includes(term) ||
                                     projectBlurb.includes(term) ||
                                     projectDescription.includes(term)));
        });

      } else {
        // If search query is empty, show all projects
        filteredList = projects;
      }

      this.setState({
        filtered: filteredList
      });
    }

    filterByCategory(category) {
      const { projects } = this.state;
      let filtered = [];

      if (projects) {
        if (category === "ALL")
          filtered = projects;
        else {
          filtered = projects.filter((project) => {
            return project.category === category;
          });
        }
      }

      this.setState({
        filtered: filtered
      });
    }

    getProjectTiles() {
      const { projects, filtered } = this.state;
      const toUse = filtered ? filtered : projects;

      let indexPage;

      if(projects) {
        // Generate project tiles from filtered or projects list
        indexPage = toUse.map(project => (
          <Col xs="auto" className="mb-4 d-flex align-items-stretch" key={project.id}>
            <ProjectTile key={project.id} project={project} />
          </Col>
        ));
      } else {
        // Show loading page if projects haven't been fetched yet
        indexPage = (<div>Loading...</div>);
      }

      return indexPage;
    }

    render() {
      return (
        <div className="wrapper">
          <Header user={this.state.user} />
          <div className="page-body">
            <Router>
              <Switch>
                <Route exact={true} path='/' render={() => (
                  <div>
                    <div className="top">
                      <InputGroup style={{"margin-left": "1em"}}>
                        <CategoryDropdown filterByCategory={this.filterByCategory} disabled={!this.state.projects} />
                        <SearchBox handleSearch={this.handleSearch} disabled={!this.state.projects} />
                      </InputGroup>
                      <span id="new-project">
                        {this.state.projects ?
                          <Link to='/projects/create' className="btn btn-outline-primary">Add new project</Link> :
                          <Link to='/projects/create' className="btn btn-outline-primary" style={{ pointerEvents: 'none' }}>Add new project</Link>
                        }
                      </span>
                    </div>
                    <Container className="mt-4">
                      <Row className="justify-content-center">
                        {this.getProjectTiles()}
                      </Row>
                    </Container>
                  </div>
                )} />
                <Route exact path='/login'
                       render={props => <LoginPage {...props} onLogin={this.login} />}
                />
                <Route exact path='/logout'
                  render={() => {
                    this.logout();
                    return <Redirect to="/" />;
                  }}
                />
                <Route exact path='/projects/create'
                       render={props => <ProjectForm {...props} user={this.state.user} />}
                />
                <Route exact path='/projects/:projectId'
                       render={props => <ProjectPage {...props} user={this.state.user} />}
                />
                <Route exact path='/projects/:projectId/edit'
                       render={props => <ProjectForm {...props} user={this.state.user} edit={true}/>}
                />
                <Route exact path='/profile'
                       render={props => <UserPage {...props} user={this.state.user} visiting={false}/>}
                />
                <Route exact path='/profile/edit'
                       render={props => <UserForm {...props} user={this.state.user}/>}
                />
                <Route exact path='/users/:userId'
                       render={props => <UserPage {...props} user={this.state.user} visiting={true}/>}
                />
              </Switch>
            </Router>
          </div>
          <div className="page-footer">
            <Footer />
          </div>
        </div>

      );
    }
}

const ProjectTile = ({ project }) => {
  return (
    <Card>
      <CardImg variant="top" src={project.logo} alt="Project Logo" />
      <CardBody>
        <CardTitle>
          {project.name}
          <div>
            {console.log(Constants.CATEGORIES[project.category].color)}
            <Badge color={`${Constants.CATEGORIES[project.category].color}`}>
              {Constants.CATEGORIES[project.category].expanded}
            </Badge>
          </div>
        </CardTitle>
          <a href={`/projects/${project.id}`} className="stretched-link">{'' + project.likes + (project.likes === 1 ? ' like' : ' likes')}<br/>{project.blurb}</a>
      </CardBody>
    </Card>
  );
};

const SearchBox = ({ handleSearch, disabled }) => (
  <span>
    <input
      type="text"
      placeholder="Search for projects"
      onChange={handleSearch}
      id="search-box"
      disabled={disabled}
    />
  </span>
);

const CategoryDropdown = ({ filterByCategory, disabled }) => (
  <UncontrolledDropdown> 
    <DropdownToggle caret>
      Categories
    </DropdownToggle>
    <DropdownMenu>
      <DropdownItem key={0} onClick={() => filterByCategory("ALL")} disabled={disabled}>
        All
      </DropdownItem>
      {Object.keys(Constants.CATEGORIES).map((categoryCode, index) => 
        <DropdownItem key={index+1} onClick={() => filterByCategory(categoryCode)} disabled={disabled}>
          {Constants.CATEGORIES[categoryCode].expanded}
        </DropdownItem>
      )}
    </DropdownMenu>
  </UncontrolledDropdown> 
);

export default App;
