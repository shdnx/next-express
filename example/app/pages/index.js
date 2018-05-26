import React from "react";
import Link from "next/link";

// Since nextpress' pageRoute() was used to declare the route for this page, you should use nextpress/page to get the data fetched from the server.
import nextpressPage from "nextpress/page";

class FrontPage extends React.Component {
  state = {
    content: null,
    isEditing: false,
    editingContent: null
  };

  constructor(props) {
    super(props);

    // TODO: use deriveStateFromProps() instead?
    this.state.content = props.content;

    this._handleEnterEdit = this._handleEnterEdit.bind(this);
    this._handleEditChange = this._handleEditChange.bind(this);
    this._handleEditSave = this._handleEditSave.bind(this);
    this._handleEditCancel = this._handleEditCancel.bind(this);
  }

  _handleEnterEdit(event) {
    this.setState(oldState => ({
      isEditing: true,
      editingContent: oldState.content
    }));
  }

  _handleEditChange(event) {
    this.setState({
      editingContent: event.target.value
    });
  }

  async _handleEditSave(event) {
    this.setState(oldState => ({
      isEditing: false,
      content: oldState.editingContent
    }));

    const response = await fetch("/api/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content: this.state.editingContent
      })
    });

    if (!response.ok) {
      console.error("Error while saving new text, response status: ", response.status);
      alert("Error while saving new text!");
    }
  }

  _handleEditCancel(event) {
    this.setState({
      isEditing: false
    });
  }

  render() {
    return (
      <div>
        <p><Link href="/otherpage"><a>Other page</a></Link> &raquo;</p>

        <h1>Hello world!</h1>

        {
          this.state.isEditing
            ? (
              <React.Fragment>
                <textarea
                  onChange={this._handleEditChange}
                  style={{ width: 400, height: 100 }}
                  value={this.state.editingContent}
                ></textarea>

                <div>
                  <button onClick={this._handleEditSave}>Save</button>
                  <button onClick={this._handleEditCancel}>Cancel</button>
                </div>
              </React.Fragment>
            )
            : (
              <React.Fragment>
                <p>{this.state.content}</p>
                <button onClick={this._handleEnterEdit}>Edit</button>
              </React.Fragment>
            )
        }
      </div>
    );
  }
};

export default nextpressPage(FrontPage);
