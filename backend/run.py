from endpoints import app
import uvicorn
def main(): 
    #runs the app
    uvicorn.run("run:app", host="127.0.0.1", port=8000, reload=True)

if __name__ == "__main__": 
    main()