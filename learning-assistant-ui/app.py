import streamlit as st
import requests
import json

# ============================================================================
# CONFIGURATION
# ============================================================================

# MCP Server URL - deployed on Cloudflare Workers
API_URL = "https://learning-assistant-mcp.mcp-weather.workers.dev"

# Page configuration
st.set_page_config(
    page_title="AI Learning Assistant",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def call_mcp_tool(tool_name: str, input_data: dict) -> dict:
    """
    Call MCP server with specified tool and input
    
    Args:
        tool_name: Name of the tool to execute
        input_data: Input parameters for the tool
        
    Returns:
        Response data as dictionary
    """
    try:
        response = requests.post(
            API_URL,
            json={
                "tool": tool_name,
                "input": input_data
            },
            timeout=10
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        return {
            "success": False,
            "error": f"Request failed: {str(e)}"
        }

# ============================================================================
# MAIN APP
# ============================================================================

def main():
    # Header
    st.title("🎓 AI Learning Assistant")
    st.markdown("*Powered by MCP Server on Cloudflare Workers*")
    st.divider()
    
    # Sidebar - Tool Selection
    st.sidebar.title("🛠️ Select Tool")
    tool = st.sidebar.radio(
        "Choose a learning tool:",
        ["📚 Wikipedia Search", "🌍 Text Translation", "📖 Dictionary Lookup"],
        label_visibility="collapsed"
    )
    
    st.sidebar.divider()
    st.sidebar.info(f"**API Endpoint:**\n`{API_URL}`")
    
    # ========================================================================
    # WIKIPEDIA SEARCH TOOL
    # ========================================================================
    
    if tool == "📚 Wikipedia Search":
        st.header("📚 Wikipedia Search")
        st.markdown("Search Wikipedia and get article summaries in any language")
        
        col1, col2 = st.columns([3, 1])
        
        with col1:
            query = st.text_input(
                "Enter search query:",
                placeholder="e.g., Machine Learning, Python Programming"
            )
        
        with col2:
            language = st.selectbox(
                "Language:",
                ["en", "pl", "es", "de", "fr", "it", "pt", "ru", "ja", "zh"],
                help="Wikipedia language code (ISO 639-1)"
            )
        
        if st.button("🔍 Search Wikipedia", use_container_width=True):
            if not query:
                st.error("⚠️ Please enter a search query")
            else:
                with st.spinner("Searching Wikipedia..."):
                    result = call_mcp_tool("searchWikipedia", {
                        "query": query,
                        "language": language
                    })
                
                if result.get("success"):
                    st.success("✅ Article found!")
                    
                    # Display thumbnail if available
                    if result.get("thumbnail"):
                        st.image(result["thumbnail"], width=300)
                    
                    # Display title and summary
                    st.subheader(result["title"])
                    st.write(result["summary"])
                    
                    # Link to full article
                    st.markdown(f"[📖 Read full article on Wikipedia]({result['url']})")
                    
                    # Show raw JSON in expander
                    with st.expander("🔍 View raw JSON response"):
                        st.json(result)
                else:
                    st.error(f"❌ Error: {result.get('error', 'Unknown error')}")
                    if result.get("suggestion"):
                        st.info(f"💡 {result['suggestion']}")
    
    # ========================================================================
    # TRANSLATION TOOL
    # ========================================================================
    
    elif tool == "🌍 Text Translation":
        st.header("🌍 Text Translation")
        st.markdown("Translate text between 100+ languages using Google Translate")
        
        # Text input
        text = st.text_area(
            "Enter text to translate:",
            height=150,
            placeholder="Type or paste text here..."
        )
        
        # Language selection
        col1, col2 = st.columns(2)
        
        with col1:
            source_lang = st.selectbox(
                "From:",
                ["en", "pl", "es", "de", "fr", "it", "pt", "ru", "ja", "zh", "ar", "hi"],
                help="Source language code"
            )
        
        with col2:
            target_lang = st.selectbox(
                "To:",
                ["pl", "en", "es", "de", "fr", "it", "pt", "ru", "ja", "zh", "ar", "hi"],
                help="Target language code"
            )
        
        if st.button("🔄 Translate", use_container_width=True):
            if not text:
                st.error("⚠️ Please enter text to translate")
            elif source_lang == target_lang:
                st.warning("⚠️ Source and target languages are the same")
            else:
                with st.spinner("Translating..."):
                    result = call_mcp_tool("translateText", {
                        "text": text,
                        "sourceLang": source_lang,
                        "targetLang": target_lang
                    })
                
                if result.get("success"):
                    st.success("✅ Translation complete!")
                    
                    # Display translation
                    st.subheader("Translation:")
                    st.info(result["translatedText"])
                    
                    # Show details
                    col1, col2 = st.columns(2)
                    with col1:
                        st.metric("Source Language", result["sourceLang"].upper())
                    with col2:
                        st.metric("Target Language", result["targetLang"].upper())
                    
                    # Show raw JSON in expander
                    with st.expander("🔍 View raw JSON response"):
                        st.json(result)
                else:
                    st.error(f"❌ Error: {result.get('error', 'Unknown error')}")
    
    # ========================================================================
    # DICTIONARY LOOKUP TOOL
    # ========================================================================
    
    elif tool == "📖 Dictionary Lookup":
        st.header("📖 Dictionary Lookup")
        st.markdown("Look up English word definitions, pronunciations, and examples")
        
        word = st.text_input(
            "Enter a word:",
            placeholder="e.g., serendipity, ephemeral, ubiquitous"
        )
        
        if st.button("🔍 Look Up", use_container_width=True):
            if not word:
                st.error("⚠️ Please enter a word")
            else:
                with st.spinner("Looking up word..."):
                    result = call_mcp_tool("lookupWord", {
                        "word": word
                    })
                
                if result.get("success"):
                    st.success(f"✅ Found definition for '{result['word']}'")
                    
                    # Display phonetics (pronunciation)
                    if result.get("phonetics"):
                        st.subheader("🔊 Pronunciation")
                        for phonetic in result["phonetics"]:
                            col1, col2 = st.columns([3, 1])
                            with col1:
                                st.code(phonetic["text"], language=None)
                            with col2:
                                if phonetic.get("audio"):
                                    st.audio(phonetic["audio"])
                    
                    # Display meanings
                    if result.get("meanings"):
                        st.subheader("📚 Definitions")
                        
                        for meaning in result["meanings"]:
                            st.markdown(f"**{meaning['partOfSpeech'].capitalize()}**")
                            
                            for idx, definition in enumerate(meaning["definitions"], 1):
                                st.markdown(f"{idx}. {definition['definition']}")
                                
                                # Show example if available
                                if definition.get("example"):
                                    st.markdown(f"   *Example: \"{definition['example']}\"*")
                                
                                # Show synonyms if available
                                if definition.get("synonyms"):
                                    synonyms = ", ".join(definition["synonyms"])
                                    st.markdown(f"   📝 Synonyms: {synonyms}")
                                
                                st.markdown("")  # Add spacing
                    
                    # Show source URLs
                    if result.get("sourceUrls"):
                        st.markdown("**📖 Sources:**")
                        for url in result["sourceUrls"]:
                            st.markdown(f"- [{url}]({url})")
                    
                    # Show raw JSON in expander
                    with st.expander("🔍 View raw JSON response"):
                        st.json(result)
                else:
                    st.error(f"❌ Error: {result.get('error', 'Unknown error')}")
                    if result.get("suggestion"):
                        st.info(f"💡 {result['suggestion']}")

# ============================================================================
# FOOTER
# ============================================================================

    st.divider()
    st.markdown("""
        <div style='text-align: center; color: gray;'>
            <p>Made with ❤️ using Streamlit and Cloudflare Workers</p>
            <p>API: <code>learning-assistant-mcp</code></p>
        </div>
    """, unsafe_allow_html=True)

# Run the app
if __name__ == "__main__":
    main()