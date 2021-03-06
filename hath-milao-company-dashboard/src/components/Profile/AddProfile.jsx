import React from "react";
import Joi from "@hapi/joi";

// reactstrap components
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Container,
  Row,
  Col,
  Form,
  FormGroup,
  Input,
  Alert,
  Label
} from "reactstrap";

// Text Editor  Imports
import { EditorState, ContentState } from "draft-js";
import htmlToDraft from "html-to-draftjs";
import { Editor } from "react-draft-wysiwyg";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import { stateToHTML } from "draft-js-export-html";
import { divStyle, editorDiv, options } from "../../util/EditorStyling";

import MultipleArrayInput from "../Helper/MultipleArrayInput.jsx";

import * as Mime from "mime-types";

import { UpdateCompany, ViewCompany } from "../../services/company.service.js";
import config from "../../util/config.json";

import ProfileSchema from "../../validationSchemas/User/ProfileSchema.js";

import { sb } from "../../util/chat.init";
import { getCurrentUser } from "../../services/auth.service";
import { message, Spin } from "antd";

class AddProfile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      name: "",
      industry: "",
      minemployees: 0,
      maxemployees: 0,
      city: [],
      country: [],
      websiteurl: "",
      description: "",
      phonenumber: "",
      specialties: [],
      error: "None",
      visible: false,
      image: null,
      selectedImage: null,
      image_meta: null,
      editorState: EditorState.createEmpty(),
      loading: false,
      buttonDisabled: false
    };
  }

  componentWillMount() {
    ViewCompany()
      .then(response => {
        if (response.data.userData.city.length > 0) {
          console.log("City han");
          let editorState = EditorState.createEmpty();
          const blocksFromHtml = htmlToDraft(
            response.data.userData.description
          );
          if (blocksFromHtml) {
            const { contentBlocks, entityMap } = blocksFromHtml;
            const contentState = ContentState.createFromBlockArray(
              contentBlocks,
              entityMap
            );
            editorState = EditorState.createWithContent(contentState);
          }

          this.setState({
            name: response.data.userData.name,
            industry: response.data.userData.industry,
            minemployees: response.data.userData.minemployees,
            maxemployees: response.data.userData.maxemployees,
            city: response.data.userData.city,
            country: response.data.userData.country,
            websiteurl: response.data.userData.websiteurl,
            description: response.data.userData.description,
            phonenumber: response.data.userData.phonenumber,
            specialties: response.data.userData.specialties,
            selectedImage: `${config.STORAGE_LINK}/${config.BUCKET_NAME}/${response.data.userData.imageurl}`,
            editorState,
            loading: true
          });

          this.forceUpdate();
        } else {
          this.setState({
            loading: true
          });
        }
      })
      .catch(err => {
        console.log(err);
      });
  }

  //Field Array Function
  allSpecialties = data => {
    this.setState(state => {
      state.specialties = data;
    });
  };

  //Cities Array Function
  allCities = data => {
    this.setState(state => {
      state.city = data;
    });
  };

  //Contry Array Function
  allCountries = data => {
    this.setState(state => {
      state.country = data;
    });
  };

  // To Handle Text Editor
  onEditorStateChange = editorState => {
    this.setState({
      editorState
    });
    let descHTML = stateToHTML(this.state.editorState.getCurrentContent());
    this.setState({
      description: descHTML
    });
  };

  // To Handle Form Input
  handleInputChange = event => {
    const { name, value } = event.target;
    this.setState({
      [name]: value
    });
  };

  handleFileChange = e => {
    if (e.target.files.length < 1) {
      this.setState({
        ...this.state,
        image: null,
        selectedImage: null,
        image_meta: null
      });
      return;
    }
    const image = e.target.files[0];
    const extension = Mime.extension(image.type) || "jpg";
    const meta = {
      size: image.size,
      name: image.name,
      contentType: image.type,
      extension: extension
    };
    this.setState({
      image: image,
      selectedImage: URL.createObjectURL(image),
      image_meta: meta
    });
  };

  onDismiss = () => {
    this.setState({ visible: false });
  };

  handleSubmit = async () => {
    this.setState({
      buttonDisabled: true
    });

    // You can also pass a callback which will be called synchronously with the validation result.
    Joi.validate(this.state, ProfileSchema, err => {
      if (err === null) {
        const profileData = this.state;
        const data = {
          image: this.state.image,
          profileData,
          userid: this.props.user.id
        };
        let chatImageURl = null;
        if (this.state.image_meta !== null) {
          chatImageURl = `${config.STORAGE_LINK}/${config.BUCKET_NAME}/public/company/${this.state.name}/profile.${this.state.image_meta.extension}`;
        } else {
          chatImageURl = this.state.selectedImage;
        }
        UpdateCompany(data)
          .then(response => {
            const USER_ID = getCurrentUser().user.id;
            sb.connect(USER_ID);
            sb.updateCurrentUserInfo(this.state.name, chatImageURl, function(
              response,
              error
            ) {
              if (error) {
                console.log(error);
                return;
              }
              message.success("Profile Updated Successfully");

              window.location.reload(true);
            });
          })
          .catch(err => {
            this.setState({
              error: err.response.data.error || "",
              visible: true,
              buttonDisabled: false
            });
          });
      } else {
        this.setState({
          error: err.details[0].message,
          visible: true,
          buttonDisabled: false
        });
      }
    }); // err === null -> valid
  };

  render() {
    return (
      <>
        <Container className="mt--7" fluid>
          <Row>
            <Col className="order-xl-1" xl="12">
              <Card className="bg-secondary shadow">
                <CardHeader className="bg-white border-0">
                  <Row className="align-items-center">
                    <Col xs="8">
                      <h3 className="mb-0">Account Settings</h3>
                    </Col>
                    <Col className="text-right" xs="4">
                      <Button
                        color="default"
                        onClick={() => {
                          window.location.reload();
                        }}
                        size="sm"
                      >
                        Back
                      </Button>
                      <Button
                        size="sm"
                        className="btn-icon btn-3"
                        color="primary"
                        type="button"
                        disabled={this.state.buttonDisabled}
                        onClick={this.handleSubmit}
                      >
                        {this.state.buttonDisabled ? (
                          <span className="btn-inner--icon">
                            <i className="fas fa-circle-notch fa-spin"></i>
                          </span>
                        ) : null}
                        <span className="btn-inner--text">Update</span>
                      </Button>
                    </Col>
                  </Row>
                </CardHeader>
                {this.state.loading ? (
                  <CardBody>
                    <Alert
                      color="danger"
                      isOpen={this.state.visible}
                      toggle={this.onDismiss}
                    >
                      {this.state.error}
                    </Alert>
                    <Form>
                      <Row>
                        <Col md="4">
                          <FormGroup>
                            <Label>
                              <h5>Company Name:</h5>
                            </Label>
                            <Input
                              type="text"
                              name="name"
                              placeholder="Company Name"
                              onChange={this.handleInputChange}
                              value={this.state.name}
                              required
                            />
                          </FormGroup>
                        </Col>
                        <Col md="4">
                          <FormGroup>
                            <Label>
                              <h5>Industry:</h5>
                            </Label>
                            <Input
                              type="text"
                              name="industry"
                              placeholder="Industry"
                              value={this.state.industry}
                              onChange={this.handleInputChange}
                              required
                            />
                          </FormGroup>
                        </Col>
                        <Col md="4">
                          <FormGroup>
                            <Label>
                              <h5>Phone Number:</h5>
                            </Label>
                            <Input
                              type="text"
                              name="phonenumber"
                              onChange={this.handleInputChange}
                              value={this.state.phonenumber}
                              placeholder="Phone(0315-XXXXXXX)"
                              required
                            />
                          </FormGroup>
                        </Col>
                      </Row>
                      <Row>
                        <Col md="4">
                          <FormGroup>
                            <Label>
                              <h5>Minimum Employees:</h5>
                            </Label>
                            <Input
                              type="number"
                              name="minemployees"
                              placeholder="Minimum Employees"
                              onChange={this.handleInputChange}
                              value={this.state.minemployees}
                              min="0"
                              required
                            />
                          </FormGroup>
                        </Col>
                        <Col md="4">
                          <FormGroup>
                            <Label>
                              <h5>Maximum Employees:</h5>
                            </Label>
                            <Input
                              type="number"
                              name="maxemployees"
                              placeholder="Maximum Employees"
                              onChange={this.handleInputChange}
                              min="0"
                              value={this.state.maxemployees}
                            />
                          </FormGroup>
                        </Col>
                        <Col md="4">
                          <FormGroup>
                            <Label>
                              <h5>Website URL:</h5>
                            </Label>
                            <Input
                              type="text"
                              name="websiteurl"
                              placeholder="Website URL"
                              value={this.state.websiteurl}
                              required
                              onChange={this.handleInputChange}
                            />
                          </FormGroup>
                        </Col>
                      </Row>
                      <Row>
                        <Col md="4">
                          <Label>
                            <h5>Specialties:</h5>
                          </Label>
                          <MultipleArrayInput
                            methodfromparent={this.allSpecialties}
                            array={this.state.specialties}
                            placeHolderString="Specialties"
                          />
                        </Col>
                        <Col md="4">
                          <Label>
                            <h5>City:</h5>
                          </Label>
                          <MultipleArrayInput
                            methodfromparent={this.allCities}
                            array={this.state.city}
                            placeHolderString="Multiple Cities"
                          />
                        </Col>
                        <Col md="4">
                          <Label>
                            <h5>Country :</h5>
                          </Label>
                          <MultipleArrayInput
                            methodfromparent={this.allCountries}
                            array={this.state.country}
                            placeHolderString="Multiple Conutries"
                          />
                        </Col>
                      </Row>
                      <Row>
                        <Col md="12">
                          <FormGroup>
                            <Label>
                              <h5>About:</h5>
                            </Label>
                            <Editor
                              wrapperStyle={divStyle}
                              editorStyle={editorDiv}
                              toolbar={{ options }}
                              editorState={this.state.editorState}
                              onEditorStateChange={this.onEditorStateChange}
                            />
                          </FormGroup>
                        </Col>
                      </Row>
                      <Row>
                        <Col md="6">
                          <FormGroup>
                            <Label>
                              <h5>Profile Picture:</h5>
                            </Label>
                            <Input
                              type="file"
                              name="picture"
                              onChange={this.handleFileChange}
                            />
                          </FormGroup>
                        </Col>

                        {this.state.selectedImage !== null ? (
                          <Col md="6">
                            <FormGroup>
                              <label>
                                <b>Image Preview: </b>
                              </label>
                              <img
                                src={this.state.selectedImage}
                                className="img-thumbnail"
                                alt="Preview Profile"
                                style={{ width: "30%" }}
                              />
                            </FormGroup>
                          </Col>
                        ) : null}
                      </Row>
                    </Form>
                  </CardBody>
                ) : (
                  <CardBody>
                    <div
                      style={{
                        textAlign: "center",
                        paddingTop: "20px",
                        paddingBottom: "20px"
                      }}
                    >
                      <Spin tip="Loading Profile Form..." size="large" />
                    </div>
                  </CardBody>
                )}
              </Card>
            </Col>
          </Row>
        </Container>
      </>
    );
  }
}
export default AddProfile;
