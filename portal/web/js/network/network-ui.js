// flags
var _autoLayout;
var _nodeLabelsVisible;
var _edgeLabelsVisible;
var _panZoomVisible;
var _linksMerged;
var _profileDataVisible;
var _selectFromTab;

// array of control functions
var _controlFunctions;

// value constants
const GENES_LIST_SIZE = 35;

// edge type constants
const IN_SAME_COMPONENT = "IN_SAME_COMPONENT";
const REACTS_WITH = "REACTS_WITH";
const STATE_CHANGE = "STATE_CHANGE";

// class constants for css visualization
const CHECKED_CLASS = "checked-menu-item";
const SEPARATOR_CLASS = "separator-menu-item";
const FIRST_CLASS = "first-menu-item";
const LAST_CLASS = "last-menu-item";
const MENU_CLASS = "main-menu-item";
const SUB_MENU_CLASS = "sub-menu-item";

// name of the graph layout
var _graphLayout = {name: "ForceDirected"};

// force directed layout options
var _layoutOptions;	

// array of selected elements, used by the visibility function for filtering
var _selectedElements;

// array of previously filtered elements
var _alreadyFiltered;

// array of filtered edge types
var _edgeTypeVisibility;

// map used to resolve cross-references
var _linkMap;

// CytoscapeWeb.Visualization instance
var _vis;

/**
 * Initializes all necessary components. This function should be invoked, before
 * calling any other function in this script.
 * 
 * @param vis	CytoscapeWeb.Visualization instance associated with this UI
 */
function initNetworkUI(vis)
{
	_vis = vis;
	_linkMap = _xrefArray();
	_alreadyFiltered = new Array();
	_edgeTypeVisibility = _edgeTypeArray();
	_resetFlags();
	
	_initControlFunctions();
	_initLayoutOptions();
	
	_initMainMenu();
	
	// adjust canvas border
	//$("#vis_content #cytoscapeweb").addClass(
	//		"ui-widget ui-widget-content ui-corner-all");
	
	// init tabs
	_refreshGenesTab();
	
	// make UI visible
	_setVisibility(true);
}

/**
 * This function handles incoming commands from the menu UI. All menu items 
 * is forwarded to this function with a specific command string.
 * 
 * @param command	command as a string
 */
function handleMenuEvent(command)
{
	// execute the corresponding function
	
	var func = _controlFunctions[command];
	func();
}

/**
 * Updates selected genes when clicked on a gene on the Genes Tab. This function
 * helps the synchronization between the genes tab and the visualization.
 * 
 * @param evt	target event that triggered the action
 */
function updateSelectedGenes(evt)
{
	// this flag is set to prevent updateGenesTab function to update the tab
	// when _vis.select function is called.
	_selectFromTab = true;
	
	var nodeIds = new Array();
	
	// deselect all nodes
	_vis.deselect("nodes");
	
	// collect id's of selected node's on the tab
	$("#genes_tab select option").each(
		function(index)
		{
			if ($(this).is(":selected"))
			{
				nodeId = $(this).val();
				nodeIds.push(nodeId);
			}
		});
	
	// select all checked nodes
	_vis.select("nodes", nodeIds);
	
	// reset flag
	_selectFromTab = false;
}

/**
 * Saves layout settings when clicked on the "Save" button of the
 * "Layout Options" panel.
 */
function saveSettings()
{
	// update layout option values 
	
	for (var i=0; i < (_layoutOptions).length; i++)
	{
		if (_layoutOptions[i].id == "weightNorm")
		{
			// TODO find the selected option
		}
		else if (_layoutOptions[i].id == "autoStabilize")
		{
			if($("#autoStabilize").is(":checked"))
			{
				_layoutOptions[i].value = true;
				$("#autoStabilize").val(true);
			}
			else
			{
				_layoutOptions[i].value = false;
				$("#autoStabilize").val(false);
			}
		}
		else
		{
			_layoutOptions[i].value = 
				$("#" + _layoutOptions[i].id).val();
		}
		
		
	}
	
	// update graphLayout options
	_updateLayoutOptions();
	
	// close the settings panel
	$("#settings_dialog").dialog("close");
}

/**
 * Reverts to default layout settings when clicked on "Default" button of the
 * "Layout Options" panel.
 */
function defaultSettings()
{
	_layoutOptions = _defaultOptsArray();
	_updateLayoutOptions();
	_updatePropsUI();
}

/**
 * Shows the node inspector when double clicked on a node.
 * 
 * @param evt	event that triggered this function
 */
function showNodeInspector(evt)
{
	// set the position of the inspector
	
	// TODO evt.target.x and evt.target.y are local (relative) coordiates inside
	// the CytoscapeWeb flash object, however those values are used as global
	// coordinate by the dialog() function. We need to transform the local
	// coordinates to global coordinates.
	//$("#node_inspector").dialog("option",
	//	"position",
	//	[_mouseX(evt), _mouseY(evt)]);
	
	// update the contents of the inspector by using the target node
	
	var data = evt.target.data;
	
	_updateNodeInspectorContent(data);
	
	// open inspector panel
	$("#node_inspector").dialog("open");
}

/**
 * Updates the content of the node inspector with respect to the provided data.
 * Data is assumed to be the data of a node.
 * 
 * @param data	node data containing necessary fields
 */
function _updateNodeInspectorContent(data)
{
	// set title
	$("#node_inspector").dialog("option",
		"title",
		data.label);
	
	// clean xref & data rows
	$("#node_inspector_content .data .data_row").remove();
	$("#node_inspector_content .xref .xref_row").remove();
	
	// for each data field, add a new row to inspector
	
	_addDataRow("node", "id", data.id);
	_addDataRow("node", "label", data.label);
	_addDataRow("node", "in query", data.IN_QUERY);
	
	for (var field in data)
	{
		if (field == "xref")
		{
			// parse the xref data, and construct the link and its label
			
			var link = _resolveXref(data[field]);
			
			// add to xref table
			if (link != null)
			{				
				_addXrefRow("node", link.href, link.text);
			}
		}
		// TODO what to do with percent values?
		/*
		else if (!field.startsWith("PERCENT"))
		{
			$("#node_inspector_content .node_data").append(
				'<tr class="data_row"><td>' +
				field + ': ' + data[field] + 
				'</td></tr>');
		}
		*/
	}
}

/**
 * Shows the edge inspector when double clicked on an edge.
 * 
 * @param evt	event that triggered this function
 */
function showEdgeInspector(evt)
{
	// set the position of the inspector
	// TODO same coordinate problems as node inspector
	//$("#edge_inspector").dialog({position: [_mouseX(evt), _mouseY(evt)]});

	// TODO update the contents of the inspector by using the target edge
	
	var data = evt.target.data;
	
	// set title
	$("#edge_inspector").dialog("option",
		"title",
		data.id);
	
	// clean xref & data rows
	$("#edge_inspector_content .data .data_row").remove();
	
	for (var field in data)
	{
		_addDataRow("edge", field, data[field]);
	}
	
	// open inspector panel
	$("#edge_inspector").dialog("open");
}

/**
 * This function shows gene details when double clicked on a node name on the
 * genes tab.
 * 
 * @param evt	event that triggered the action
 */
function showGeneDetails(evt)
{
	// retrieve the selected node
	var node = _vis.node(evt.target.value);
	
	// TODO position the inspector, (also center the selected gene?)
	
	// update inspector content
	_updateNodeInspectorContent(node.data);
	
	$("#node_inspector").dialog("open");
}

/**
 * Updates the gene tab if at least one node is selected or deselected on the 
 * network. This function helps the synchronization between the genes tab and
 * visualization.
 * 
 * @param evt	event that triggered the action
 */
function updateGenesTab(evt)
{
	if(!_selectFromTab)
	{
		var selected = _vis.selected("nodes");
		
		// deselect all options
		$("#genes_tab select option").each(
			function(index)
			{
				$(this).removeAttr("selected");
			});
		
		// select options for selected nodes
		for (var i=0; i < selected.length; i++)
		{
			$("#" +  _shortId(selected[i].data.id)).attr(
				"selected", "selected");
		}
	}
}



/**
 * Filters out all selected genes.
 */
function filterSelectedGenes()
{
	// update selected elements
	_selectedElements = _vis.selected("nodes");

	// filter out selected elements
    _vis.filter("nodes", visibility, true);
    
    // refresh genes tab
    _refreshGenesTab();
    
    // visualization changed, perform layout if necessary
	_visChanged();
}

/**
 * Filters out all non-selected genes.
 */
function filterNonSelectedGenes()
{
	// update selected elements
	_selectedElements = _vis.selected("nodes");

	// filter out non-selected elements
    _vis.filter('nodes', geneVisibility, true);
    
    // refresh Genes tab
    _refreshGenesTab();
    updateGenesTab();
    
    // visualization changed, perform layout if necessary
	_visChanged();
}

/**
 * Updates the visibility (by filtering mechanism) of edges.
 */
function updateEdges()
{
	// update filtered edge types
	
	_edgeTypeVisibility[IN_SAME_COMPONENT] = $("#in_same_component").is(":checked");
	_edgeTypeVisibility[REACTS_WITH] = $("#reacts_with").is(":checked");
	_edgeTypeVisibility[STATE_CHANGE] = $("#state_change").is(":checked");
	
	// remove current edge filters
	_vis.removeFilter("edges");
	
	// filter selected types
	_vis.filter("edges", edgeVisibility, true);
}

/**
 * Determines the visibility of an edge for filtering purposes.
 * 
 * @param element	egde to be checked for visibility criteria
 * @return			true if the edge should be visible, false otherwise
 */
function edgeVisibility(element)
{
	var visible;
	
	// if an element is already filtered then it should remain invisible
	if (_alreadyFiltered[element.data.id] != null)
	{
		visible = false;
	}
	// unknown edge type, do not filter
	else if (_edgeTypeVisibility[element.data.type] == null)
	{
		visible = true;
	}
	// check for the visibility of the edge type
	else
	{
		visible = _edgeTypeVisibility[element.data.type];
	}
	
	return visible;
}

/**
 * Determines the visibility of a gene (node) for filtering purposes.
 * 
 * @param element	gene to be checked for visibility criteria
 * @return			true if the gene should be visible, false otherwise
 */
function geneVisibility(element)
{
	var visible = false;
	
	// if an element is already filtered then it should remain invisible
	if (_alreadyFiltered[element.data.id] != null)
	{
		visible = false;
	}
	else
	{
		// TODO find a better way (?) to check if it is selected.
		
		// filter non-selected nodes
		
		for (var i=0; i < _selectedElements.length; i++)
		{
			if (element.data.id == _selectedElements[i].data.id)
			{
				visible = true;
				break;
			}
		}
		
		if (!visible)
		{
			// if the element should be filtered, then add it to the map
			_alreadyFiltered[element.data.id] = element;
		}
	}
	
	return visible;
}

/**
 * This function returns false if the given graph element is selected,
 * returns true otherwise. This function is used to hide (filter) selected
 * nodes & edges.
 * 
 * @param element	element to be checked
 * @return			false if selected, true otherwise
 */
function visibility(element)
{
	// if an element is already filtered then it should remain invisible
	// until the filters are reset
	if (_alreadyFiltered[element.data.id] != null)
	{
		return false;
	}
	// if an edge type is hidden all edges of that type should be invisible
	else if (_edgeTypeVisibility[element.data.type] != null
			&& !_edgeTypeVisibility[element.data.type])
	{
		return false;
	}
	
	// TODO find a better way (?) to check if it is selected, do not traverse
	// all selected elements
	
	for (var i=0; i < _selectedElements.length; i++)
	{
		if (element.data.id == _selectedElements[i].data.id)
		{
			_alreadyFiltered[element.data.id] = element;
			return false;
		}
	}
	
	return true;
}

function _visChanged()
{
	if (_autoLayout)
	{
		// re-apply layout
		_performLayout();
	}
}

/**
 * Highlights the neighbors of the selected nodes.
 * 
 * The content of this method is copied from GeneMANIA (genemania.org) sources.
 */
function _highlightNeighbors(/*nodes*/)
{
	/*
	if (nodes == null)
	{
		nodes = _vis.selected("nodes");
	}
	*/
	
	var nodes = _vis.selected("nodes");
	
	if (nodes != null && nodes.length > 0)
	{
		var fn = _vis.firstNeighbors(nodes, true);
		var neighbors = fn.neighbors;
		var edges = fn.edges;
		edges = edges.concat(fn.mergedEdges);
		neighbors = neighbors.concat(fn.rootNodes);
        var bypass = _vis.visualStyleBypass() || {};
		
		if( ! bypass.nodes )
		{
            bypass.nodes = {};
        }
        if( ! bypass.edges )
        {
            bypass.edges = {};
        }

		var allNodes = _vis.nodes();
		
		$.each(allNodes, function(i, n) {
		    if( !bypass.nodes[n.data.id] ){
		        bypass.nodes[n.data.id] = {};
		    }
			bypass.nodes[n.data.id].opacity = 0.25;
	    });
		
		$.each(neighbors, function(i, n) {
		    if( !bypass.nodes[n.data.id] ){
		        bypass.nodes[n.data.id] = {};
		    }
			bypass.nodes[n.data.id].opacity = 1;
		});

		var opacity;
		var allEdges = _vis.edges();
		allEdges = allEdges.concat(_vis.mergedEdges());
		
		$.each(allEdges, function(i, e) {
		    if( !bypass.edges[e.data.id] ){
		        bypass.edges[e.data.id] = {};
		    }
		    /*
		    if (e.data.networkGroupCode === "coexp" || e.data.networkGroupCode === "coloc") {
		    	opacity = AUX_UNHIGHLIGHT_EDGE_OPACITY;
		    } else {
		    	opacity = DEF_UNHIGHLIGHT_EDGE_OPACITY;
		    }
		    */
		    
		    opacity = 0.15;
		    
			bypass.edges[e.data.id].opacity = opacity;
			bypass.edges[e.data.id].mergeOpacity = opacity;
	    });
		
		$.each(edges, function(i, e) {
		    if( !bypass.edges[e.data.id] ){
		        bypass.edges[e.data.id] = {};
		    }
		    /*
		    if (e.data.networkGroupCode === "coexp" || e.data.networkGroupCode === "coloc") {
		    	opacity = AUX_HIGHLIGHT_EDGE_OPACITY;
		    } else {
		    	opacity = DEF_HIGHLIGHT_EDGE_OPACITY;
		    }
		    */
		    
		    opacity = 0.85;
		    
			bypass.edges[e.data.id].opacity = opacity;
			bypass.edges[e.data.id].mergeOpacity = opacity;
		});

		_vis.visualStyleBypass(bypass);
		//CytowebUtil.neighborsHighlighted = true;
		
		//$("#menu_neighbors_clear").removeClass("ui-state-disabled");
	}
}

/**
 * Removes all highlights from the visualization.
 * 
 * The content of this method is copied from GeneMANIA (genemania.org) sources.
 */
function _removeHighlights()
{
	var bypass = _vis.visualStyleBypass();
	bypass.edges = {};
	
	var nodes = bypass.nodes;
	
	for (var id in nodes)
	{
		var styles = nodes[id];
		delete styles["opacity"];
		delete styles["mergeOpacity"];
	}
	
	_vis.visualStyleBypass(bypass);

	//CytowebUtil.neighborsHighlighted = false;
	//$("#menu_neighbors_clear").addClass("ui-state-disabled");
}

/**
 * Adds a data row to the node or edge inspector.
 * 
 * @param type		type of the inspector (should be "node" or "edge")
 * @param label		label of the data field
 * @param value		value of the data field
 */
function _addDataRow(type, label, value)
{
	$("#" + type + "_inspector_content .data").append(
		'<tr class="data_row"><td>' +
		label + ': ' + value + 
		'</td></tr>');
}

/**
 * Adds a cross reference row to the node or edge inspector.
 * 
 * @param type		type of the inspector (should be "node" or "edge")
 * @param href		URL of the reference 
 * @param label		label to be displayed
 */
function _addXrefRow(type, href, label)
{
	$("#" + type + "_inspector_content .xref").append(
		'<tr class="xref_row"><td>' +
		'<a href="' + href + '" target="_blank">' +
		label + '</a>' + 
		'</td></tr>');
}

/**
 * Generates the URL and the display text for the given xref string.
 * 
 * @param xref	xref as a string
 * @return		array of href and text pairs for the given xref
 */
function _resolveXref(xref)
{
	var link = null;
	
	if (xref != null)
	{
		// split the string into two parts
		var pieces = xref.split(":", 2);
		
		// construct the link object containing href and text
		link = new Object();
		link.href = _linkMap[pieces[0].toLowerCase()] + "" + pieces[1];
		link.text = xref;
	}
	
	return link;
}

/**
 * Set default values of the control flags.
 */
function _resetFlags()
{
	_autoLayout = false;
	_nodeLabelsVisible = true;
	_edgeLabelsVisible = false;
	_panZoomVisible = true;
	_linksMerged = true;
	_profileDataVisible = true;
	_selectFromTab = false;
}

/**
 * Set visibility of the UI.
 * 
 * @param visible	a boolean to set the visibility.
 */
function _setVisibility(visible)
{
	if (visible)
	{
		if ($("#network_menu_div").hasClass("hidden-network-ui"))
		{
			$("#network_menu_div").removeClass("hidden-network-ui");
			$("#network_tabs").removeClass("hidden-network-ui");
			$("#node_inspector").removeClass("hidden-network-ui");
			$("#edge_inspector").removeClass("hidden-network-ui");
			$("#settings_dialog").removeClass("hidden-network-ui");
		}
	}
	else
	{
		if (!$("#network_menu_div").hasClass("hidden-network-ui"))
		{
			$("#network_menu_div").addClass("hidden-network-ui");
			$("#network_tabs").addClass("hidden-network-ui");
			$("#node_inspector").addClass("hidden-network-ui");
			$("#edge_inspector").addClass("hidden-network-ui");
			$("#settings_dialog").addClass("hidden-network-ui");
		}
	}
}

/**
 * Creates an array containing default option values for the ForceDirected
 * layout.
 * 
 * @return	an array of default layout options
 */
function _defaultOptsArray()
{
	var defaultOpts = 
		[ { id: "gravitation", label: "Gravitation",       value: -500,   tip: "The gravitational constant. Negative values produce a repulsive force." },
		  { id: "mass",        label: "Node mass",         value: 3,      tip: "The default mass value for nodes." },
		  { id: "tension",     label: "Edge tension",      value: 0.1,    tip: "The default spring tension for edges." },
		  { id: "restLength",  label: "Edge rest length",  value: "auto", tip: "The default spring rest length for edges." },
		  { id: "drag",        label: "Drag co-efficient", value: 0.4,    tip: "The co-efficient for frictional drag forces." },
		  { id: "minDistance", label: "Minimum distance",  value: 1,      tip: "The minimum effective distance over which forces are exerted." },
		  { id: "maxDistance", label: "Maximum distance",  value: 10000,  tip: "The maximum distance over which forces are exerted." },
		  { id: "weightAttr",  label: "Weight Attribute",  value: "",  tip: "The name of the edge attribute that contains the weights." },
		  { id: "weightNorm",  label: "Weight Normalization", value: "linear",  tip: "How to interpret weight values." },
		  { id: "iterations",  label: "Iterations",        value: 400,    tip: "The number of iterations to run the simulation." },
		  { id: "maxTime",     label: "Maximum time",      value: 30000,  tip: "The maximum time to run the simulation, in milliseconds." },
		  { id: "autoStabilize", label: "Auto stabilize",  value: true,   tip: "If checked, Cytoscape Web automatically tries to stabilize results that seems unstable after running the regular iterations." } ];
	
	return defaultOpts;
}

/**
 * Creates a map for xref entries.
 * 
 * @return	an array (map) of xref entries
 */
function _xrefArray()
{
	var linkMap = new Array();
	
	linkMap["entrez gene"] = "http://www.ncbi.nlm.nih.gov/gene?term=";	
	linkMap["hgnc"] = "http://www.genenames.org/cgi-bin/quick_search.pl?.cgifields=type&type=equals&num=50&search=";
	//linkMap["hgnc"] = "";
	linkMap["nucleotide sequence database"] = "";	
	linkMap["refseq"] =	"";
	linkMap["uniprot"] = "http://www.uniprot.org/uniprot/";
	
	return linkMap;
}

/**
 * Creates a map for edge type visibility.
 * 
 * @return	an array (map) of edge type visibility.
 */
function _edgeTypeArray()
{
	var typeArray = new Array();
	
	// by default every edge type is visible
	typeArray[IN_SAME_COMPONENT] = true;
	typeArray[REACTS_WITH] = true;
	typeArray[STATE_CHANGE] = true;
	
	return typeArray;
}

/**
 * Initializes the main menu by adjusting its style. Also, initializes the
 * inspector panels and tabs.
 */
function _initMainMenu()
{	
	$("#nav ul").css({display: "none"}); // Opera fix
	
	$("#nav li").hover(
		function() {
			$(this).find('ul:first').css(
					{visibility: "visible",display: "none"}).show(400);
		},
		function() {
			$(this).find('ul:first').css({visibility: "hidden"});
		});
	
	// adjust separators between menu items
	
	$("#network_menu_file").addClass(MENU_CLASS);
	$("#network_menu_topology").addClass(MENU_CLASS);
	$("#network_menu_view").addClass(MENU_CLASS);
	
	$("#save_as_png").addClass(FIRST_CLASS);
	$("#save_as_png").addClass(SEPARATOR_CLASS);
	$("#save_as_png").addClass(LAST_CLASS);
	
	$("#hide_selected").addClass(FIRST_CLASS);
	$("#hide_selected").addClass(SEPARATOR_CLASS);	
	$("#auto_layout").addClass(SEPARATOR_CLASS);
	$("#auto_layout").addClass(LAST_CLASS);
	
	$("#perform_layout").addClass(FIRST_CLASS);
	$("#perform_layout").addClass(SEPARATOR_CLASS);
	//$("#layout_properties").addClass(SUB_MENU_CLASS);
	$("#show_profile_data").addClass(SEPARATOR_CLASS);
	$("#highlight_neighbors").addClass(SEPARATOR_CLASS);
	$("#merge_links").addClass(SEPARATOR_CLASS);
	$("#show_pan_zoom_control").addClass(LAST_CLASS);
	
	// init check icons for checkable menu items
	
	if (_autoLayout)
	{
		$("#auto_layout").addClass(CHECKED_CLASS);
	}
	else
	{
		$("#auto_layout").removeClass(CHECKED_CLASS);
	}
	
	if (_nodeLabelsVisible)
	{
		$("#show_node_labels").addClass(CHECKED_CLASS);
	}
	else
	{
		$("#show_node_labels").removeClass(CHECKED_CLASS);
	}
	
	if (_edgeLabelsVisible)
	{
		$("#show_edge_labels").addClass(CHECKED_CLASS);
	}
	else
	{
		$("#show_edge_labels").removeClass(CHECKED_CLASS);
	}
	
	if (_panZoomVisible)
	{
		$("#show_pan_zoom_control").addClass(CHECKED_CLASS);
	}
	else
	{
		$("#show_pan_zoom_control").removeClass(CHECKED_CLASS);
	}
	
	if (_linksMerged)
	{
		$("#merge_links").addClass(CHECKED_CLASS);
	}
	else
	{
		$("#merge_links").removeClass(CHECKED_CLASS);
	}
	
	if (_profileDataVisible)
	{
		$("#show_profile_data").addClass(CHECKED_CLASS);
	}
	else
	{
		$("#show_profile_data").removeClass(CHECKED_CLASS);
	}
	
	// adjust settings panel
	$("#settings_dialog").dialog({autoOpen: false, 
		resizable: false, 
		width: 300});
	
	// adjust node inspector
	$("#node_inspector").dialog({autoOpen: false, 
		resizable: false, 
		width: 300});
	
	// adjust edge inspector
	$("#edge_inspector").dialog({autoOpen: false, 
		resizable: false, 
		width: 300});

	
//	$("#node_inspector a").qtip(
//		{
//			content: 'Some basic content for the tooltip'
//		});
	
	// create tabs
	$("#network_tabs").tabs();
}

/*
function _refreshGenesTab()
{
	var nodes = _vis.nodes();
	
	//$("#genes_tab .genes_list li").remove();
	$("#genes_tab table").remove();
	
	
//	for (var i=0; i < nodes.length; i++)
//	{
//		$("#genes_tab .genes_list").append(
//			"<li> " + nodes[i].data.id + "</li>");
//	}
	
	
	$("#genes_tab").append('<table></table>');
	
	for (var i=0; i < nodes.length; i++)
	{
		var shortId = _shortId(nodes[i].data.id);
		
		$("#genes_tab table").append( '<tr><td>' +
			'<input type="checkbox" id="' + nodes[i].data.id + 
			'" onClick="handleCheckEvent(\'' + nodes[i].data.id + '\')" >' + 
			'<label>' + shortId + '</label>' +
			'</input>' + '</td></tr>');
	}
}
*/

/**
 * Refreshes the content of the genes tab, by populating the list with visible
 * (i.e. non-filtered) genes.
 */
function _refreshGenesTab()
{
	// get visible genes
	var geneList = _visibleGenes();
	
	// clear old content
	$("#genes_tab select").remove();
	
	// set size of the list
	$("#genes_tab").append('<select multiple size="' + 
			GENES_LIST_SIZE + '"></select>');
	
	// add new content
	
	for (var i=0; i < geneList.length; i++)
	{
		var shortId = _shortId(geneList[i].data.id);
		var classContent;
		
		if (geneList[i].data["IN_QUERY"])
		{
			classContent = 'class="in_query" ';
		}
		else
		{
			classContent = ' ';
		}
		
		$("#genes_tab select").append(
			'<option id="' + shortId + '" ' +
			classContent + 
			'value="' + geneList[i].data.id + '" ' + '>' + 
			'<label>' + geneList[i].data.label + '</label>' +
			'</option>');
		
		$("#genes_tab #" + shortId).click(updateSelectedGenes);
		$("#genes_tab #" + shortId).select(updateSelectedGenes);
		$("#genes_tab #" + shortId).dblclick(showGeneDetails);
	}
}


/**
 * Creates a map with <command, function> pairs.
 * 
 * @return an array (map) of control functions
 */
function _initControlFunctions()
{
	_controlFunctions = new Array();
	
	_controlFunctions["hide_selected"] = _hideSelected;
	_controlFunctions["unhide_all"] = _unhideAll;
	_controlFunctions["perform_layout"] = _performLayout;
	_controlFunctions["show_node_labels"] = _toggleNodeLabels;
	//_controlFunctions["show_edge_labels"] = _toggleEdgeLabels;
	_controlFunctions["merge_links"] = _toggleMerge;
	_controlFunctions["show_pan_zoom_control"] = _togglePanZoom;
	_controlFunctions["auto_layout"] = _toggleAutoLayout;
	_controlFunctions["show_profile_data"] = _toggleProfileData;
	_controlFunctions["save_as_png"] = _saveAsPng;
	_controlFunctions["save_as_svg"] = _saveAsSvg;
	_controlFunctions["layout_properties"] = _openProperties;
	_controlFunctions["highlight_neighbors"] = _highlightNeighbors;
	_controlFunctions["remove_highlights"] = _removeHighlights;
	
	// TODO temp test button, remove when done
	_controlFunctions["joker_button"] = jokerAction;
	
	// add button listeners
	
	$("#save_layout_settings").click(saveSettings);
	$("#default_layout_settings").click(defaultSettings);
	$("#filter_genes").click(filterSelectedGenes);
	$("#crop_genes").click(filterNonSelectedGenes);
	$("#update_edges").click(updateEdges);
	
	// add listener for double click action
	
	_vis.addListener("dblclick",
		"nodes",
		showNodeInspector);
	
	_vis.addListener("dblclick",
		"edges",
		showEdgeInspector);
	
	// add listener for node select & deselect actions
	
	_vis.addListener("select",
		"nodes",
		updateGenesTab);
	
	_vis.addListener("deselect",
		"nodes",
		updateGenesTab);
}

/**
 * Initializes the layout options by default values and updates the
 * corresponding UI content.
 */
function _initLayoutOptions()
{
	_layoutOptions = _defaultOptsArray();
	_updateLayoutOptions();
}

/**
 * Hides (filters) selected nodes and edges.
 */
function _hideSelected()
{
	// update selected elements
	_selectedElements = _vis.selected();
	
	// filter out selected elements
    _vis.filter('all', visibility, true);
    
    // refresh genes tab
    _refreshGenesTab();
    
    // visualization changed, perform layout if necessary
	_visChanged();
}

/**
 * Removes any existing filters to unhide filtered nodes & edges. However, 
 * this operation does not remove the filtering based on edge types.
 */
function _unhideAll()
{
	// remove all filters
	_vis.removeFilter(null);
	
	// reset array of already filtered elements
	_alreadyFiltered = new Array();
	
	// re-apply filtering based on edge types
	updateEdges();
	
	// refresh & update genes tab 
	_refreshGenesTab();
	updateGenesTab();
	
	// visualization changed, perform layout if necessary
	_visChanged();
}

/**
 * Creates an array of visible (i.e. non-filtered) genes.
 * 
 * @return		array of visible genes
 */
function _visibleGenes()
{
	var genes = new Array();
	var nodes = _vis.nodes();

    for (var i=0; i < nodes.length; i++)
    {
    	// TODO also check if a node is a gene or small molecule!
    	// include only genes, not small molecules
    	if (_alreadyFiltered[nodes[i].data.id] == null)
    	{
    		genes.push(nodes[i]);
    	}
    }
    
    return genes;
}

/**
 * Performs the current layout on the graph.
 */
function _performLayout()
{
	_vis.layout(_graphLayout);
}

/**
 * Temporary function for debugging purposes
 */
function jokerAction()
{
	var selectedElements = _vis.selected();
	
	var str = "";
	
	if (selectedElements.length > 0)
	{
		str += "fields: ";
		
		for (var field in selectedElements[0])
		{
			str += field + ";";
		}
		
		str += "\n";
		str += "data: \n";
		
		for (var field in selectedElements[0].data)
		{
			str += field + ": " +  selectedElements[0].data[field] + "\n";
		}
	}
	
	alert(str);
}

/**
 * Toggles the visibility of the node labels.
 */
function _toggleNodeLabels()
{
	// update visibility of labels 
	
	_nodeLabelsVisible = !_nodeLabelsVisible;
	_vis.nodeLabelsVisible(_nodeLabelsVisible);
	
	// update check icon of the corresponding menu item
	
	var item = $("#show_node_labels");
	
	if (_nodeLabelsVisible)
	{
		item.addClass(CHECKED_CLASS);
	}
	else
	{
		item.removeClass(CHECKED_CLASS);
	}
}

/**
 * Toggles the visibility of the edge labels.
 */
function _toggleEdgeLabels()
{
	// update visibility of labels 
	
	_edgeLabelsVisible = !_edgeLabelsVisible;
	_vis.edgeLabelsVisible(_edgeLabelsVisible);
	
	// update check icon of the corresponding menu item
	
	var item = $("#show_edge_labels");
	
	if (_edgeLabelsVisible)
	{
		item.addClass(CHECKED_CLASS);
	}
	else
	{
		item.removeClass(CHECKED_CLASS);
	}
}

/**
 * Toggles the visibility of the pan/zoom control panel.
 */
function _togglePanZoom()
{
	// update visibility of the pan/zoom control
	
	_panZoomVisible = !_panZoomVisible;
	
	_vis.panZoomControlVisible(_panZoomVisible);
	
	// update check icon of the corresponding menu item
	
	var item = $("#show_pan_zoom_control");
	
	if (_panZoomVisible)
	{
		item.addClass(CHECKED_CLASS);
	}
	else
	{
		item.removeClass(CHECKED_CLASS);
	}
}

/**
 * Merges the edges, if not merged. If edges are already merges, then show all
 * edges.
 */
function _toggleMerge()
{
	// merge/unmerge the edges
	
	_linksMerged = !_linksMerged;
	
	_vis.edgesMerged(_linksMerged);
	
	// update check icon of the corresponding menu item
	
	var item = $("#merge_links");
	
	if (_linksMerged)
	{
		item.addClass(CHECKED_CLASS);
	}
	else
	{
		item.removeClass(CHECKED_CLASS);
	}
}

/**
 * Toggle auto layout options on or off. If auto layout is active, then the
 * graph is laid out automatically upon any change.
 */
function _toggleAutoLayout()
{
	// toggle autoLayout option
	
	_autoLayout = !_autoLayout;
	
	// update check icon of the corresponding menu item
	
	var item = $("#auto_layout");
	
	if (_autoLayout)
	{
		item.addClass(CHECKED_CLASS);
	}
	else
	{
		item.removeClass(CHECKED_CLASS);
	}
}

/**
 * Toggles the visibility of the profile data for the nodes.
 */
function _toggleProfileData()
{
	// TODO update visibility of profile data
	
	_profileDataVisible = !_profileDataVisible;
	
	// update check icon of the corresponding menu item
	
	var item = $("#show_profile_data");
	
	if (_profileDataVisible)
	{
		item.addClass(CHECKED_CLASS);
	}
	else
	{
		item.removeClass(CHECKED_CLASS);
	}
}

/**
 * Saves the network as a PNG image.
 */
function _saveAsPng()
{
	_vis.exportNetwork('png', 'export_network.jsp?type=png');
}

/**
 * Saves the network as a SVG image.
 */
function _saveAsSvg()
{
	_vis.exportNetwork('svg', 'export_network.jsp?type=svg');
}

/**
 * Displays the layout properties panel.
 */
function _openProperties()
{	
	_updatePropsUI();
	$("#settings_dialog").dialog("open");
}

/**
 * Updates the contents of the layout properties panel.
 */
function _updatePropsUI()
{
	// update settings panel UI
	
	for (var i=0; i < _layoutOptions.length; i++)
	{
		if (_layoutOptions[i].id == "weightNorm")
		{
			// TODO set the correct option as selected
			
			$("#norm_" + _layoutOptions[i].value).attr("selected", "selected");
		}
		else if (_layoutOptions[i].id == "autoStabilize")
		{
			if (_layoutOptions[i].value == true)
			{
				// check the box
				$("#autoStabilize").attr("checked", true);
				$("#autoStabilize").val(true);
			}
			else
			{
				// uncheck the box
				$("#autoStabilize").attr("checked", false);
				$("#autoStabilize").val(false);
			}
		}
		else
		{
			$("#" + _layoutOptions[i].id).val(_layoutOptions[i].value);
		}
	}
}

/**
 * Updates the graphLayout options for CytoscapeWeb.
 */
function _updateLayoutOptions()
{
	// update graphLayout object
	
	var options = new Object();
	
	for (var i=0; i < _layoutOptions.length; i++)
	{
		options[_layoutOptions[i].id] = _layoutOptions[i].value; 
	}
	
	_graphLayout.options = options;
}

/**
 * Generates a shortened version of the given node id.
 * 
 * @param id	id of a node
 * @return		a shortened version of the id
 */
function _shortId(id)
{
	var shortId = id;
	
	if (id.contains("#"))
	{
		var pieces = shortId.split("#");
		shortId = pieces[pieces.length - 1];
	}
	else if (id.contains(":"))
	{
		var pieces = shortId.split(":");
		shortId = pieces[pieces.length - 1];
	}
	
	return shortId;
}

// TODO get the x-coordinate of the event target (with respect to the window). 
function _mouseX(evt)
{
	if (evt.pageX)
	{
		return evt.pageX;
	}
	else if (evt.clientX)
	{
		return evt.clientX + (document.documentElement.scrollLeft ?
			   document.documentElement.scrollLeft :
				   document.body.scrollLeft);
	}	
	else
	{
		return 0;
	}
}

//TODO get the y-coordinate of the event target (with respect to the window).
function _mouseY(evt)
{
	if (evt.pageY)
	{
		return evt.pageY;
	}
	else if (evt.clientY)
	{
		return evt.clientY + (document.documentElement.scrollTop ?
			   document.documentElement.scrollTop :
				   document.body.scrollTop);
	}
	else
	{
		return 0;
	}
}