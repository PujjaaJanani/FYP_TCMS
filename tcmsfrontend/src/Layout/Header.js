import {Navbar, Nav} from 'react-bootstrap'
function Header (){
    return(
        <div>
            <Navbar bg="dark" variant="dark">
            <Navbar.Brand href="#home">Navbar</Navbar.Brand>
            <Nav> className="mr-auto
                <Nav.Link href="#home">Home</Nav.Link>
                <Nav.Link href="#features">Home</Nav.Link>
                <Nav.Link href="#pricing">Home</Nav.Link>
            </Nav>
            </Navbar>
        </div>
    );
}

export default Header;